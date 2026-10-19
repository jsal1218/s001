// Source for three-racer.js: the parts of three.js r186 (MIT) that Highway Rush uses, bundled + minified with esbuild.
// Rebuild (from /tmp or anywhere with three@0.186.1 and esbuild installed):
//   esbuild vendor-entry.js --bundle --minify --format=esm --outfile=three-racer.js
export {ACESFilmicToneMapping,AdditiveBlending,Box3,BoxGeometry,CanvasTexture,ClampToEdgeWrapping,Color,CylinderGeometry,DirectionalLight,DoubleSide,Euler,Fog,FrontSide,
 Group,HemisphereLight,IcosahedronGeometry,InstancedMesh,Matrix4,Mesh,MeshBasicMaterial,MeshPhysicalMaterial,MeshStandardMaterial,PCFShadowMap,PMREMGenerator,
 PerspectiveCamera,PlaneGeometry,Quaternion,RepeatWrapping,SRGBColorSpace,Scene,Sprite,SpriteMaterial,Vector3,WebGLRenderer} from 'three';
export {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
export {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
