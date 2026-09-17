from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel

Modality = Literal["MR", "CT", "DX", "MG", "US", "NM"]
Domain = Literal["brain", "lung", "breast", "bone", "skin"]
RiskLevel = Literal["low", "moderate", "high", "normal"]

class DomainProbability(BaseModel):
    domain: Domain
    probability: float
    label: str

class DomainClassificationResult(BaseModel):
    predictedDomain: Domain
    confidence: float
    latencyMs: float
    probabilities: List[DomainProbability]
    analysisTimestamp: str

class ClassProbability(BaseModel):
    className: str
    displayName: str
    probability: float
    riskLevel: RiskLevel

class DiagnosticResult(BaseModel):
    domain: Domain
    predictedClass: str
    displayName: str
    riskLevel: RiskLevel
    confidence: float
    classProbabilities: List[ClassProbability]
    latencyMs: float
    totalPipelineMs: float

class ClinicalSessionResult(BaseModel):
    sessionId: str
    imageFile: str
    domainClassification: DomainClassificationResult
    diagnosticFinding: DiagnosticResult
    timestamp: str

class DicomMetadata(BaseModel):
    patientMRN: str
    patientName: str
    patientDOB: str
    patientSex: str
    studyDate: str
    studyUID: str
    seriesUID: str
    accessionNumber: str
    modality: str
    bodyPartExamined: str
    sliceThickness: Optional[str] = None
    repetitionTime: Optional[str] = None
    echoTime: Optional[str] = None
    magneticFieldStrength: Optional[str] = None
    kvp: Optional[str] = None
    exposureTime: Optional[str] = None
    institution: str
    referringPhysician: str
    imagingDevice: str

class DiagnosisResponse(BaseModel):
    sessionResult: ClinicalSessionResult
    dicomMetadata: DicomMetadata

class AuditLogEntry(BaseModel):
    id: str
    timestamp: str
    actor: str
    action: str
    details: str
    status: str

class TenantConfigResponse(BaseModel):
    hospitalName: str
    departmentName: str
    facilityCode: str
    dicomAeTitle: str
    regulatoryDisclaimer: str
    modelVersion: str
    lastValidatedDate: str
    supportContact: str
    anonymizationProtocol: str
    availableDomains: List[str]
