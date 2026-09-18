"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Domain } from "@/lib/types";
import {
  get3DLesionColor,
  classifyClinicalRisk,
  ORGAN_SPATIAL_REGISTRY,
} from "@/utils/riskRegistry";

const MODEL_URLS: Record<Domain, string> = {
  brain: "/models/brain.glb",
  lung: "/models/lung.glb",
  bone: "/models/bone.glb",
  breast: "/models/breast.glb",
  skin: "/models/skin.glb",
};

interface OrganMeshesProps {
  domain: Domain;
  predictedClass?: string | null;
  opacity: number;
  wireframe: boolean;
  cutPlaneActive: boolean;
  cutPlaneDepth: number;
}

function applyMaterialToScene(
  scene: THREE.Object3D,
  material: THREE.Material
) {
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.material = material;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
}

interface GLBOrganMeshProps {
  url: string;
  color: string;
  opacity: number;
  wireframe: boolean;
  clippingPlanes: THREE.Plane[];
  targetSize?: number;
  rotation?: [number, number, number];
  roughness?: number;
  metalness?: number;
  transmission?: number;
}

function GLBOrganMesh({
  url,
  color,
  opacity,
  wireframe,
  clippingPlanes,
  targetSize = 2.4,
  rotation = [0, 0, 0],
  roughness = 0.38,
  metalness = 0.06,
  transmission,
}: GLBOrganMeshProps) {
  const { scene } = useGLTF(url);

  const normalizedScene = useMemo(() => {
    const clone = scene.clone(true);

    const box = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = targetSize / maxDim;

    clone.position.set(-center.x, -center.y, -center.z);

    const wrapper = new THREE.Group();
    wrapper.add(clone);
    wrapper.scale.setScalar(scale);

    return wrapper;
  }, [scene, targetSize]);

  const effectiveTransmission =
    transmission !== undefined
      ? transmission
      : opacity < 0.92
      ? 0.25
      : 0.0;

  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity,
        roughness,
        metalness,
        transmission: effectiveTransmission,
        ior: 1.34,
        wireframe,
        clippingPlanes,
        clipShadows: true,
        side: THREE.DoubleSide,
        depthWrite: opacity > 0.35,
      }),
    [
      color,
      opacity,
      roughness,
      metalness,
      effectiveTransmission,
      wireframe,
      clippingPlanes,
    ]
  );

  useEffect(() => {
    applyMaterialToScene(normalizedScene, material);
  }, [normalizedScene, material]);

  return (
    <primitive
      object={normalizedScene}
      rotation={rotation}
    />
  );
}

export function BrainAnatomyMesh({
  opacity,
  wireframe,
  clippingPlanes,
}: {
  opacity: number;
  wireframe: boolean;
  clippingPlanes: THREE.Plane[];
}) {
  return (
    <GLBOrganMesh
      url={MODEL_URLS.brain}
      color="#BAE6FD"
      opacity={opacity}
      wireframe={wireframe}
      clippingPlanes={clippingPlanes}
      targetSize={2.4}
    />
  );
}

export function LungAnatomyMesh({
  opacity,
  wireframe,
  clippingPlanes,
}: {
  opacity: number;
  wireframe: boolean;
  clippingPlanes: THREE.Plane[];
}) {
  return (
    <GLBOrganMesh
      url={MODEL_URLS.lung}
      color="#93C5FD"
      opacity={opacity}
      wireframe={wireframe}
      clippingPlanes={clippingPlanes}
      targetSize={2.4}
    />
  );
}

export function BoneAnatomyMesh({
  opacity,
  wireframe,
  clippingPlanes,
}: {
  opacity: number;
  wireframe: boolean;
  clippingPlanes: THREE.Plane[];
}) {
  return (
    <GLBOrganMesh
      url={MODEL_URLS.bone}
      color="#E2E8F0"
      opacity={opacity}
      wireframe={wireframe}
      clippingPlanes={clippingPlanes}
      targetSize={2.4}
      roughness={0.48}
      metalness={0.02}
    />
  );
}

export function BreastAnatomyMesh({
  opacity,
  wireframe,
  clippingPlanes,
}: {
  opacity: number;
  wireframe: boolean;
  clippingPlanes: THREE.Plane[];
}) {
  return (
    <GLBOrganMesh
      url={MODEL_URLS.breast}
      color="#F472B6"
      opacity={opacity}
      wireframe={wireframe}
      clippingPlanes={clippingPlanes}
      targetSize={2.4}
      roughness={0.35}
    />
  );
}

export function SkinAnatomyMesh({
  opacity,
  wireframe,
  clippingPlanes,
}: {
  opacity: number;
  wireframe: boolean;
  clippingPlanes: THREE.Plane[];
}) {
  return (
    <GLBOrganMesh
      url={MODEL_URLS.skin}
      color="#FED7AA"
      opacity={opacity}
      wireframe={wireframe}
      clippingPlanes={clippingPlanes}
      targetSize={2.5}
      roughness={0.55}
    />
  );
}

export function DynamicLesionOverlay({
  domain,
  predictedClass,
  clippingPlanes,
}: {
  domain: Domain;
  predictedClass?: string | null;
  clippingPlanes: THREE.Plane[];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  const riskTier = classifyClinicalRisk(predictedClass);
  const lesionColor = useMemo(
    () => get3DLesionColor(predictedClass),
    [predictedClass]
  );
  const isHighRisk = riskTier === "high";

  const spatialMeta =
    ORGAN_SPATIAL_REGISTRY[domain] || ORGAN_SPATIAL_REGISTRY.brain;
  const position = spatialMeta.defaultLesionOffset;

  const lesionMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(lesionColor),
        emissive: new THREE.Color(lesionColor),
        emissiveIntensity: isHighRisk ? 0.6 : 0.3,
        roughness: 0.25,
        metalness: 0.2,
        clippingPlanes,
        clipShadows: true,
      }),
    [lesionColor, isHighRisk, clippingPlanes]
  );

  const haloMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(lesionColor),
        transparent: true,
        opacity: isHighRisk ? 0.35 : 0.2,
        wireframe: true,
        clippingPlanes,
      }),
    [lesionColor, isHighRisk, clippingPlanes]
  );

  useFrame(() => {
    const t = performance.now() / 1000;
    if (meshRef.current) {
      const pulseSpeed = isHighRisk ? 3.5 : 2.0;
      const pulseScale =
        1.0 + Math.sin(t * pulseSpeed) * (isHighRisk ? 0.12 : 0.06);
      meshRef.current.scale.set(pulseScale, pulseScale, pulseScale);
    }
    if (haloRef.current) {
      const haloSpeed = isHighRisk ? 2.5 : 1.5;
      const haloScale = 1.35 + Math.sin(t * haloSpeed) * 0.15;
      haloRef.current.scale.set(haloScale, haloScale, haloScale);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} material={lesionMaterial}>
        <sphereGeometry args={[0.22, 28, 28]} />
      </mesh>
      <mesh ref={haloRef} material={haloMaterial}>
        <sphereGeometry args={[0.26, 16, 16]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.32, 0.35, 32]} />
        <meshBasicMaterial
          color={new THREE.Color(lesionColor)}
          side={THREE.DoubleSide}
          transparent
          opacity={0.7}
          clippingPlanes={clippingPlanes}
        />
      </mesh>
    </group>
  );
}

useGLTF.preload(MODEL_URLS.brain);
useGLTF.preload(MODEL_URLS.lung);
useGLTF.preload(MODEL_URLS.bone);
useGLTF.preload(MODEL_URLS.breast);
useGLTF.preload(MODEL_URLS.skin);

export default function OrganMeshes({
  domain,
  predictedClass,
  opacity,
  wireframe,
  cutPlaneActive,
  cutPlaneDepth,
}: OrganMeshesProps) {
  const clippingPlanes = useMemo(() => {
    if (!cutPlaneActive) return [];
    return [new THREE.Plane(new THREE.Vector3(0, -1, 0), cutPlaneDepth)];
  }, [cutPlaneActive, cutPlaneDepth]);

  return (
    <group>
      {domain === "brain" && (
        <BrainAnatomyMesh
          opacity={opacity}
          wireframe={wireframe}
          clippingPlanes={clippingPlanes}
        />
      )}
      {domain === "lung" && (
        <LungAnatomyMesh
          opacity={opacity}
          wireframe={wireframe}
          clippingPlanes={clippingPlanes}
        />
      )}
      {domain === "bone" && (
        <BoneAnatomyMesh
          opacity={opacity}
          wireframe={wireframe}
          clippingPlanes={clippingPlanes}
        />
      )}
      {domain === "breast" && (
        <BreastAnatomyMesh
          opacity={opacity}
          wireframe={wireframe}
          clippingPlanes={clippingPlanes}
        />
      )}
      {domain === "skin" && (
        <SkinAnatomyMesh
          opacity={opacity}
          wireframe={wireframe}
          clippingPlanes={clippingPlanes}
        />
      )}

      {predictedClass && (
        <DynamicLesionOverlay
          domain={domain}
          predictedClass={predictedClass}
          clippingPlanes={clippingPlanes}
        />
      )}
    </group>
  );
}
