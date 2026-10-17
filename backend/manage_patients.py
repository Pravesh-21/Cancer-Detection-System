"""
manage_patients.py — Admin CLI for the confidential patient registry.

Identifiers are encrypted in MongoDB, so Atlas / Compass shows ciphertext for
names, MRNs, phones and emails. Use this tool to look patients up in plaintext.

  python manage_patients.py genkey                 # new PATIENT_DATA_KEY (do once, back it up!)
  python manage_patients.py stats                  # counts by status / risk
  python manage_patients.py recent [-n 20]         # most recently seen patients
  python manage_patients.py find --mrn MRN-001     # decrypted profile + visit history
  python manage_patients.py show PT-ABC123         # same, by patient code
  python manage_patients.py erase PT-ABC123 --yes  # delete the patient's whole folder
"""

import argparse
import json
import sys

from dotenv import load_dotenv

load_dotenv()

from cryptography.fernet import Fernet  # noqa: E402


def _store():
    import patient_store
    store = patient_store.init_store()
    if store is None:
        sys.exit(f"Patient registry unavailable: {patient_store._store_error}")
    return store


def _print_patient(store, patient):
    ident = {k: store.decrypt(v) for k, v in patient.get("identity", {}).items()}
    print(f"\n{patient['patient_code']}  ({patient.get('visit_count', 0)} visits)")
    for k, v in ident.items():
        print(f"  {k:<14} {v}")
    print(f"  {'sex':<14} {patient.get('sex')}\n  {'blood_group':<14} {patient.get('blood_group')}")
    print("  Visits:")
    for v in patient.get("visits", []):
        ai = v.get("ai_result") or {}
        notes = store.decrypt((v.get("review") or {}).get("doctor_notes"))
        print(f"    {v['visit_code']}  {v['created_at']:%Y-%m-%d %H:%M}  {v['status']:<10} "
              f"{ai.get('domain') or '-':<6} {ai.get('display_name') or '-'} "
              f"{'(%s)' % ai.get('risk_level') if ai else ''}")
        if notes:
            print(f"      notes: {notes}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("genkey")
    sub.add_parser("stats")
    r = sub.add_parser("recent"); r.add_argument("-n", type=int, default=20)
    f = sub.add_parser("find"); f.add_argument("--mrn", required=True)
    s = sub.add_parser("show"); s.add_argument("patient_code")
    e = sub.add_parser("erase"); e.add_argument("patient_code"); e.add_argument("--yes", action="store_true")
    args = p.parse_args()

    if args.cmd == "genkey":
        print("Add this to backend/.env AND to Render > Environment. Back it up securely —")
        print("if it is lost, stored patient identities can never be decrypted.\n")
        print(f"PATIENT_DATA_KEY={Fernet.generate_key().decode()}")
        return

    store = _store()

    if args.cmd == "stats":
        print(f"patient folders: {store.patients.count_documents({})}")
        total = next(store.patients.aggregate([{"$group": {"_id": None, "n": {"$sum": {"$size": "$visits"}}}}]), {})
        print(f"visits:          {total.get('n', 0)}")
        for field in ("status", "ai_result.risk_level", "ai_result.domain"):
            rows = store.patients.aggregate([
                {"$unwind": "$visits"},
                {"$group": {"_id": f"$visits.{field}", "n": {"$sum": 1}}},
                {"$sort": {"n": -1}},
            ])
            print(f"by {field}: " + json.dumps({str(x['_id']): x['n'] for x in rows}))
    elif args.cmd == "recent":
        for pt in store.patients.find().sort("last_visit_at", -1).limit(args.n):
            print(f"{pt['patient_code']}  {store.decrypt(pt['identity'].get('full_name')):<28} "
                  f"visits={pt.get('visit_count', 0):<3} last={pt.get('last_visit_at'):%Y-%m-%d}")
    elif args.cmd in ("find", "show"):
        # The same MRN can exist at several hospitals — show every match with its hospital
        q = {"mrn_hash": store.mrn_hash(args.mrn)} if args.cmd == "find" else {"patient_code": args.patient_code}
        matches = list(store.patients.find(q))
        if not matches:
            sys.exit("No matching patient.")
        for pt in matches:
            hospital = store.db["hospitals"].find_one({"_id": pt.get("hospital_id")}) or {}
            print(f"\n[{hospital.get('hospital_code', '?')}] {hospital.get('name', 'unknown hospital')}")
            _print_patient(store, pt)
    elif args.cmd == "erase":
        if not args.yes:
            sys.exit("Refusing to erase without --yes (this permanently deletes the patient's whole folder).")
        print(f"Deleted {store.erase_patient(args.patient_code)} patient folder(s).")


if __name__ == "__main__":
    main()
