function testVolumetricModel() {
    const canvas = document.getElementsByTagName('canvas')[0];
    
    canvas.onmousedown = handleMouseDown;
    canvas.onmouseup = handleMouseUp;
    canvas.onmousemove = handleMouseMove;
               
    let [gl, programs, textures, framebuffers] = setupGraphics(canvas, cameraParams);
    let frame = 0;
    uploadDepthData(gl, textures, frame0, width, height, frame);
    createModel(gl, programs, framebuffers, textures, frame, mat4.create());

    frame = 1;
    uploadDepthData(gl, textures, frame1, width, height, frame);
    createModel(gl, programs, framebuffers, textures, frame, knownMovementInv);
    let animate = function () {
        renderModel(gl, programs, textures, frame, canvas);
        // window.requestAnimationFrame(animate);
    };
    animate();
}

function setupGraphics(canvas, cameraParameters) {
    let width = cameraParameters.width;
    let height = cameraParameters.height;
    let gl = setupGL(canvas);
    let programs = setupPrograms(gl);
    initAttributes(gl, programs);
    let textures = setupTextures(gl, programs, width, height);
    initUniforms(gl, programs, textures, cameraParameters, width, height);
    let framebuffers = initFramebuffers(gl, programs, textures);
    return [gl, programs, textures, framebuffers];
}

let width = 250;
let height = 200;
let cameraParams = createFakeCameraParams(width, height);
let frame0Transform = getViewMatrix(5, 0, 0.5);
let frame1Transform = getViewMatrix(0, 10, 0.5);
let [frame0, frame0Normals] = createFakeData(width, height, frame0Transform);
let [frame1, frame1Normals] = createFakeData(width, height, frame1Transform);
let knownMovementInv = mat4.create();

try {
    testVolumetricModel();
} catch(e){
    console.log(e);
}