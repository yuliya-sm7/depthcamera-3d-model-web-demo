// Copyright 2018 Intel Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// This block of parameters and data is only for the artificially generated
// depth data.
let width = 250;
let height = 200;
let frame0Transform = getViewMatrix(5, 0, 0.5);
let frame1Transform = getViewMatrix(0, 10, 0.5);
// mat4.translate(frame1Transform, frame1Transform, vec3.fromValues(0.0, 0.1, 0.0));
let knownMovement = getMovement(frame1Transform, frame0Transform);
let knownMovementInv = mat4.create();
mat4.invert(knownMovementInv, knownMovement);
let [frame0, frame0Normals] = createFakeData(width, height, frame0Transform);
let [frame1, frame1Normals] = createFakeData(width, height, frame1Transform);
let cameraParams = createFakeCameraParams(width, height);

// Depth map captured from an actual camera.
let realFrameUrl = "https://raw.githubusercontent.com/intel/depthcamera-3d-model-web-demo/devel/images/depth/";
let realCameraParams = getRealCameraParams();


class Test {
    constructor(testName) {
        let allTestsDiv = document.getElementById('tests');
        this.div = document.createElement('div');
        allTestsDiv.appendChild(this.div);

        let header = document.createElement('h3');
        let headerText = document.createTextNode(testName);
        header.appendChild(headerText);
        this.div.appendChild(header);

        this.msgDiv = document.createElement('div');
        // show newlines
        this.msgDiv.style.whiteSpace = "pre-wrap";
        this.div.appendChild(this.msgDiv);

        this.canvas = document.createElement('canvas');
        this.canvas.width = 600;
        this.canvas.height = 500;
        this.canvas.style.display = "none";
        this.div.appendChild(this.canvas);
    }
    print(message) {
        this.msgDiv.innerHTML += `${message}<br>`;
    }
    showCanvas() {
        this.canvas.style.display = "block";
    }
    bindMouseToCanvas() {
        this.canvas.onmousedown = handleMouseDown;
        this.canvas.onmouseup = handleMouseUp;
        this.canvas.onmousemove = handleMouseMove;
    }
    check(condition, errorMessage) {
        if (condition === true) {
            this.print("<font color='green'>PASS</font>");
        } else {
            let msg = "<font color='red'>FAIL</font>";
            if (errorMessage !== undefined) {
                msg += ", " + errorMessage;
            }
            this.print(msg);
        }
    }
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

function testIndexCoordCoversion() {
    let test = new Test("Test coversion between indices and image coordinates");
    let epsilon = 0.01;
    let width = 100;
    let height = 100;

    let i = 50;
    let j = 50;
    let expectedx = 0;
    let expectedy = 0;
    let coordx, coordy;
    [coordx, coordy] = getCoordFromIndex(i, j, width, height);
    test.check(Math.abs(coordx - expectedx) < epsilon
               && Math.abs(coordy - expectedy) < epsilon,
        "The image coordinates were supposed to be ["
        + expectedx + ", " + expectedy + "] but are ["
        + coordx + ", " + coordy + "]");
    let i_, j_;
    [i_, j_] = getIndexFromCoord(coordx, coordy, width, height);
    test.check(i === i_ && j === j_);

    i = 0;
    j = 0;
    expectedx = 0.5;
    expectedy = -0.5;
    coordx, coordy;
    [coordx, coordy] = getCoordFromIndex(i, j, width, height);
    test.check(Math.abs(coordx - expectedx) < epsilon
               && Math.abs(coordy - expectedy) < epsilon,
        "The image coordinates were supposed to be ["
        + expectedx + ", " + expectedy + "] but are ["
        + coordx + ", " + coordy + "]");
    [i_, j_] = getIndexFromCoord(coordx, coordy, width, height);
    test.check(i === i_ && j === j_);

    i = 99;
    j = 99;
    expectedx = -0.5;
    expectedy = 0.5;
    coordx, coordy;
    [coordx, coordy] = getCoordFromIndex(i, j, width, height);
    test.check(Math.abs(coordx - expectedx) < epsilon
               && Math.abs(coordy - expectedy) < epsilon,
        "The image coordinates were supposed to be ["
        + expectedx + ", " + expectedy + "] but are ["
        + coordx + ", " + coordy + "]");
    [i_, j_] = getIndexFromCoord(coordx, coordy, width, height);
    test.check(i === i_ && j === j_);

    width = 200;
    height = 100;
    i = 100;
    j = 50;
    expectedx = 0.0;
    expectedy = 0.0;
    coordx, coordy;
    [coordx, coordy] = getCoordFromIndex(i, j, width, height);
    test.check(Math.abs(coordx - expectedx) < epsilon
               && Math.abs(coordy - expectedy) < epsilon,
        "The image coordinates were supposed to be ["
        + expectedx + ", " + expectedy + "] but are ["
        + coordx + ", " + coordy + "]");
    [i_, j_] = getIndexFromCoord(coordx, coordy, width, height);
    test.check(i === i_ && j === j_);

    i = 0;
    j = 0;
    expectedx = 0.5;
    expectedy = -0.5;
    coordx, coordy;
    [coordx, coordy] = getCoordFromIndex(i, j, width, height);
    test.check(Math.abs(coordx - expectedx) < epsilon
               && Math.abs(coordy - expectedy) < epsilon,
        "The image coordinates were supposed to be ["
        + expectedx + ", " + expectedy + "] but are ["
        + coordx + ", " + coordy + "]");
    [i_, j_] = getIndexFromCoord(coordx, coordy, width, height);
    test.check(i === i_ && j === j_);
}

function testCorrespondingPointCPU() {
    let test = new Test("Test the corresponding points are the same for"
                        + " identical frames");
    let i, j, p, q;
    let foundDiff = false;
    for (i = 0; i < width; i++) {
        if (foundDiff) break;
        for (j = 0; j < height; j++) {
            let result = correspondingPoint(frame0,
                frame0, frame0Normals, mat4.create(), i, j, cameraParams);
            if (result.length != 3) continue;
            [p, q, _] = result;
            if (!arraysEqual(p, q, 0.0)) {
                foundDiff = true;
                break;
            }
        }
    }
    test.check(!foundDiff, "The found corresponding points between identical"
        + " frames were not themselves identical."
        + "\np: " + p
        + "\nq: " + q
        + "\ni, j: " + (i-1) + " " + j);
}

function testVolumetricModel() {
    let test = new Test("Test volumetric model (visual test only)");
    test.showCanvas();
    test.bindMouseToCanvas();
    test.print("Visual test only. Should show a sphere and a box next to each"
               + " other. It should be a combination of the two input frames"
               + " shown above.");
    let [gl, programs, textures, framebuffers] = setupGraphics(test.canvas, cameraParams);
    let frame = 0;
    uploadDepthData(gl, textures, frame0, width, height, frame);
    createModel(gl, programs, framebuffers, textures, frame, mat4.create());

    frame = 1;
    uploadDepthData(gl, textures, frame1, width, height, frame);
    createModel(gl, programs, framebuffers, textures, frame, knownMovementInv);
    let animate = function () {
        renderModel(gl, programs, textures, frame, test.canvas);
        // window.requestAnimationFrame(animate);
    };
    animate();
}

function testMovementEstimationIdentity() {
    let test = new Test("Test movement estimation with no movement");
    let [gl, programs, textures, framebuffers] = setupGraphics(test.canvas, cameraParams);
    let frame = 0;
    uploadDepthData(gl, textures, frame0, width, height, frame);
    createModel(gl, programs, framebuffers, textures, frame, mat4.create());

    frame = 1;
    uploadDepthData(gl, textures, frame0, width, height, frame);
    let movement, info;
    [movement, info] = estimateMovement(gl, programs, textures, framebuffers, frame);
    test.check(arraysEqual(movement, mat4.create(), 0.0),
        "estimated movement is not identity:\n" + arrayToStr(movement, 4, 4));
    test.check(info["error"] < 1e-10, "error wasn't close enough to 0 " + info["error"]);
}

function testMovementEstimation() {
    let test = new Test("Test movement estimation");
    let [gl, programs, textures, framebuffers] = setupGraphics(test.canvas, cameraParams);
    let frame = 0;
    uploadDepthData(gl, textures, frame0, width, height, frame);
    createModel(gl, programs, framebuffers, textures, frame, mat4.create());

    frame = 1;
    uploadDepthData(gl, textures, frame1, width, height, frame);
    let movement, info;
    [movement, info] = estimateMovement(gl, programs, textures, framebuffers, frame);
    let movementInv = mat4.create();
    mat4.invert(movementInv, movement);
    createModel(gl, programs, framebuffers, textures, frame, movementInv);

    test.check(arraysEqual(movement, knownMovement, 0.01),
        "Estimated movement is not close enough to actual movement.\n"
        + "Expected:\n"
        + arrayToStr(knownMovement, 4, 4)
        + "Calculated:\n"
        + arrayToStr(movement, 4, 4));

    // test.showCanvas();
    // test.bindMouseToCanvas();
    // let animate = function () {
    //     renderModel(gl, programs, textures, frame, test.canvas);
    //     window.requestAnimationFrame(animate);
    // };
    // animate();
}


function testNumberOfUsedPointsSameFrame() {
    // Give identical frames to the motion estimation, first to the CPU version
    // and then the GPU version. Check that the number of corresponding points
    // they found and used is the same.
    let test = new Test("Compare number of used points between versions, same frame");
    let infoCPU;
    [_, infoCPU] = estimateMovementCPU(frame0, frame0, cameraParams, 1);

    let [gl, programs, textures, framebuffers] = setupGraphics(test.canvas, cameraParams);
    let frame = 0;
    uploadDepthData(gl, textures, frame0, width, height, frame);
    createModel(gl, programs, framebuffers, textures, frame, mat4.create());

    frame = 1;
    uploadDepthData(gl, textures, frame0, width, height, frame);
    let infoGPU;
    [_, infoGPU] = estimateMovement(gl, programs, textures, framebuffers, frame);
    test.check(infoGPU["pointsFound"] === infoCPU["pointsFound"],
        "Number of points found in GPU version is different than in CPU"
        + " version.\nGPU version found " + infoGPU["pointsFound"]
        + " non-zero points, while the CPU version found "
        + infoCPU["pointsFound"] + " points.");
    test.check(infoGPU["pointsUsed"] === infoCPU["pointsUsed"],
        "Number of points used in GPU version is different than in CPU"
        + " version.\nGPU version used " + infoGPU["pointsUsed"]
        + " non-zero points, while the CPU version used "
        + infoCPU["pointsUsed"] + " points.");
}

function compareEquationsBetweenVersions() {
    let test = new Test("Compare CPU and GPU versions of movement estimation");
    let infoCPU;
    [_, infoCPU] = estimateMovementCPU(frame1, frame0, cameraParams, 1);

    let [gl, programs, textures, framebuffers] = setupGraphics(test.canvas, cameraParams);
    let frame = 0;
    uploadDepthData(gl, textures, frame0, width, height, frame);
    createModel(gl, programs, framebuffers, textures, frame, mat4.create());

    frame = 1;
    uploadDepthData(gl, textures, frame1, width, height, frame);
    let infoGPU;
    [_, infoGPU] = estimateMovement(gl, programs, textures, framebuffers, frame, 1);
    test.check(infoGPU["pointsFound"] === infoCPU["pointsFound"],
        "Number of points found in GPU version is different than in CPU"
        + " version.\nGPU version found " + infoGPU["pointsFound"]
        + " non-zero points, while the CPU version found "
        + infoCPU["pointsFound"] + " points.");
    test.check(infoGPU["pointsUsed"] === infoCPU["pointsUsed"],
        "Number of points used in GPU version is different than in CPU"
        + " version.\nGPU version used " + infoGPU["pointsUsed"]
        + " non-zero points, while the CPU version used "
        + infoCPU["pointsUsed"] + " points.");
    test.check(Math.abs(infoGPU["error"] - infoCPU["error"]) < 0.001,
        "The error in the GPU version (" + infoGPU["error"].toFixed(5)
        + ") is too different from the error in the CPU version("
        + infoCPU["error"].toFixed(5) + ")");
    test.check(arraysEqual(infoGPU["b"], infoCPU["b"], 0.001),
        "The vector b in Ax=b created from the GPU version differs from the one"
        + " created by the CPU version.\nGPU version b = "
        + arrayToStr(infoGPU["b"], 6, 1)
        + "CPU version b = " + arrayToStr(infoCPU["b"], 6, 1));
    test.check(arrays2DEqual(infoGPU["A"], infoCPU["A"], 0.1, true),
        "The matrix A in Ax=b created from the GPU version differs from the one"
        + " created by the CPU version.\nGPU version A = \n"
        + array2DToStr(infoGPU["A"])
        + "\nCPU version A = \n"
        + array2DToStr(infoCPU["A"]));
}

function testCPUMovementEstimationIdentity() {
    let test = new Test("Test movement estimation on CPU with no movement");
    let movement;
    [movement, info] = estimateMovementCPU(frame0, frame0, cameraParams, 1, frame0Normals);
    test.check(arraysEqual(movement, mat4.create(), 0.0),
        "estimated movement is not identity: " + arrayToStr(movement, 4, 4));
    test.check(info["error"] < 1e-10, "error wasn't close enough to 0 " + info["error"]);
}

function testCPUMovementEstimation() {
    let test = new Test("Test Movement Estimation on CPU");
    let [gl, programs, textures, framebuffers] = setupGraphics(test.canvas, cameraParams);
    let x = mat4.create();
    let movement;
    [movement, _] = estimateMovementCPU(frame1, frame0, cameraParams);
    // TODO not sure why the CPU version is a bit less precise than the GPU
    // version.
    test.check(arraysEqual(movement, knownMovement, 0.1),
        "Estimated movement is not close enough to actual movement.\n"
        + "Expected:\n"
        + arrayToStr(knownMovement, 4, 4)
        + "Calculated:\n"
        + arrayToStr(movement, 4, 4));

    let frame = 0;
    uploadDepthData(gl, textures, frame0, width, height, frame);
    createModel(gl, programs, framebuffers, textures, frame, mat4.create());

    frame = 1;
    let movementInv = mat4.create();
    mat4.invert(movementInv, movement);
    uploadDepthData(gl, textures, frame1, width, height, frame);
    createModel(gl, programs, framebuffers, textures, frame, movementInv);
    // test.showCanvas();
    // test.bindMouseToCanvas();
    // let animate = function () {
    //     renderModel(gl, programs, textures, frame, test.canvas);
    //     window.requestAnimationFrame(animate);
    // };
    // animate();
}

function compareCorrespondingPointsVersions() {
    let test = new Test("Compare corresponding points and normals between"
        + " CPU and GPU versions.");
    let [gl, programs, textures, framebuffers] = setupGraphics(test.canvas, cameraParams);
    let frame = 0;
    uploadDepthData(gl, textures, frame0, width, height, frame);
    createModel(gl, programs, framebuffers, textures, frame, mat4.create());

    frame = 1;
    uploadDepthData(gl, textures, frame1, width, height, frame);

    program = programs.points;
    gl.useProgram(program);
    let l = gl.getUniformLocation(program, 'cubeTexture');
    gl.uniform1i(l, textures.cube[frame%2].glId);
    l = gl.getUniformLocation(program, 'depthTexture');
    gl.uniform1i(l, textures.depth[frame%2].glId);
    l = gl.getUniformLocation(program, 'previousDepthTexture');
    gl.uniform1i(l, textures.depth[(frame+1)%2].glId);
    gl.viewport(0, 0, textures.points.normal.width,
        textures.points.normal.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.points);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    let stride = 4;
    let dataCrossGPU = new Float32Array(width*height*stride);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, dataCrossGPU);
    dataCrossGPU.width = width;
    dataCrossGPU.height = height;
    let dataNormalGPU = new Float32Array(width*height*stride);
    gl.readBuffer(gl.COLOR_ATTACHMENT1);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, dataNormalGPU);
    dataNormalGPU.width = width;
    dataNormalGPU.height = height;
    let dataDotErrorGPU = new Float32Array(width*height*stride);
    gl.readBuffer(gl.COLOR_ATTACHMENT2);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, dataDotErrorGPU);
    dataDotErrorGPU.width = width;
    dataDotErrorGPU.height = height;

    let epsilon = 0.00001;
    let normalsDiff = false;
    let crossDiff = false;
    let dotDiff = false;
    let crossCPU = vec3.create();
    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            let result = correspondingPoint(frame1,
                frame0, undefined, mat4.create(), i, j, cameraParams);
            if (result.length != 3) continue;
            let [p, q, normalCPU] = result;
            vec3.cross(crossCPU, p, normalCPU);
            let tmp = vec3.create();
            vec3.sub(tmp, p, q);
            let dotCPU = vec3.dot(tmp, normalCPU);
            let index = (j*dataNormalGPU.width + i)*stride;
            let crossGPU = vec3.fromValues(dataCrossGPU[index],
                dataCrossGPU[index+1], dataCrossGPU[index+2]);
            let normalGPU = vec3.fromValues(dataNormalGPU[index],
                dataNormalGPU[index+1], dataNormalGPU[index+2]);
            let dotGPU = dataDotErrorGPU[index];
            if (!arraysEqual(normalCPU, normalGPU, epsilon)) {
                normalsDiff = true;
            }
            if (!arraysEqual(crossCPU, crossGPU, epsilon)) {
                crossDiff = true;
            }
            if (Math.abs(dotCPU - dotGPU) >= epsilon) {
                dotDiff = true;
            }
        }
    }
    test.check(!normalsDiff, "There is a difference between the normals");
    test.check(!crossDiff, "There is a difference between the cross products");
    test.check(!dotDiff, "There is difference between dot products");
}

function testPointsShaderNormals() {
    // Note: the normals won't look right in this kind of test if there is any
    // movement between the frames, because the fragment shader can't move the
    // pixel to another position. This doesn't matter for the actual purpose of
    // the shader, it just can't be visually checked.
    let test = new Test("Test normals in points shader (visual test only)");
    let [gl, programs, textures, framebuffers] = setupGraphics(test.canvas, cameraParams);
    let canvas1 = document.createElement('canvas');
    let canvas2 = document.createElement('canvas');
    test.div.appendChild(canvas1);
    test.div.appendChild(canvas2);
    test.print("Visual test only. Should show 2 similar images. The left one is"
               + " precisely generated while the right one is estimated in the"
               + " points shader - it will be a lot more grainy.");

    let frame = 0;
    uploadDepthData(gl, textures, frame1, width, height, frame);
    createModel(gl, programs, framebuffers, textures, frame, mat4.create());

    frame = 1;
    uploadDepthData(gl, textures, frame1, width, height, frame);

    program = programs.points;
    gl.useProgram(program);
    let l = gl.getUniformLocation(program, 'cubeTexture');
    gl.uniform1i(l, textures.cube[frame%2].glId);
    l = gl.getUniformLocation(program, 'depthTexture');
    gl.uniform1i(l, textures.depth[frame%2].glId);
    l = gl.getUniformLocation(program, 'previousDepthTexture');
    gl.uniform1i(l, textures.depth[(frame+1)%2].glId);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.points);
    gl.viewport(0, 0, textures.points.normal.width,
        textures.points.normal.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    let stride = 4;
    const d = new Float32Array(width*height*stride);
    gl.readBuffer(gl.COLOR_ATTACHMENT1);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, d);
    d.width = width;
    d.height = height;
    showNormals(canvas1, frame1Normals);
    showNormals(canvas2, d);
}

function testSumShaderSinglePass() {
    // Sum 2x2 blocks of data, where each block is a 5x3 array of vectors. Get
    // a single block of data as a result.
    let test = new Test("Test sum shader single pass");
    let [gl, programs, textures, framebuffers] = setupGraphics(test.canvas, cameraParams);

    let width = 2;
    let height = 2;
    // size of each block
    let blockWidth = 5;
    let blockHeight = 3;
    // length of each vector
    let stride = 4;
    // The sum shader starts with some power of two number of blocks and then
    // reduces is to 1/4 of that original size, until only a single block is
    // left. This tests the last stage where 4 blocks are reduced to a single
    // block.
    let sumTextureLevel = framebuffers.sum.length - 2;
    let size = (blockWidth*width)*(blockHeight*height)*stride;
    let fakeData = new Float32Array(size);
    for (let i = 0; i < size; i+=stride) {
        fakeData[i+0] = 1.0;
        fakeData[i+1] = 2.0;
        fakeData[i+2] = 3.0;
    }
    let expectedData = new Float32Array(blockWidth*blockHeight*stride);
    for (let i = 0; i < blockWidth*blockHeight*stride; i+=stride) {
        expectedData[i+0] = 1.0*width*height;
        expectedData[i+1] = 2.0*width*height;
        expectedData[i+2] = 3.0*width*height;
    }
    // upload input data
    let texture = textures.sum[sumTextureLevel];
    texture.upload(gl, fakeData);

    // run sum shader
    sumTextureLevel = framebuffers.sum.length - 1;
    let program = programs.sum;
    gl.useProgram(program);
    l = gl.getUniformLocation(program, 'inputTexture');
    gl.uniform1i(l, texture.glId);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.sum[sumTextureLevel]);
    gl.viewport(0, 0, textures.sum[sumTextureLevel].width, textures.sum[sumTextureLevel].height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.finish();
    // read back data from shader
    const data = new Float32Array(blockWidth * blockHeight * stride);
    gl.readPixels(0, 0, blockWidth, blockHeight, gl.RGBA, gl.FLOAT, data);
    test.check(arraysEqual(data, expectedData),
        "Summed data from shader don't match expected sum\n"
        + "\nExpected:\n"
        + expectedData
        + "\nActual:\n"
        + data);
}
function testSumShader() {
    // Sum width x height blocks of data, where each block is a 5x3 array of
    // vectors. Get a single block of data as a result.
    let test = new Test("Test sum shader");
    let [gl, programs, textures, framebuffers] = setupGraphics(test.canvas, cameraParams);

    // size of each block
    let blockWidth = 5;
    let blockHeight = 3;
    // length of each vector
    let stride = 4;
    let size = (blockWidth*width)*(blockHeight*height)*stride;
    let fakeData = new Float32Array(size);
    for (let i = 0; i < size; i+=stride) {
        fakeData[i+0] = 1.0;
        fakeData[i+1] = 2.0;
        fakeData[i+2] = 3.0;
    }
    let expectedData = new Float32Array(blockWidth*blockHeight*stride);
    for (let i = 0; i < blockWidth*blockHeight*stride; i+=stride) {
        expectedData[i+0] = 1.0*width*height;
        expectedData[i+1] = 2.0*width*height;
        expectedData[i+2] = 3.0*width*height;
    }
    // upload input data
    let texture = textures.matrices;
    texture.upload(gl, fakeData);

    // run sum shader
    let program = programs.sum;
    gl.useProgram(program);
    l = gl.getUniformLocation(program, 'inputTexture');
    gl.uniform1i(l, textures.matrices.glId);
    for (let i = 0; i < framebuffers.sum.length; i += 1) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.sum[i]);
        gl.viewport(0, 0, textures.sum[i].width, textures.sum[i].height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.finish();
        l = gl.getUniformLocation(program, 'inputTexture');
        gl.uniform1i(l, textures.sum[i].glId);
    }
    // read back data from shader
    const data = new Float32Array(blockWidth * blockHeight * stride);
    gl.readPixels(0, 0, blockWidth, blockHeight, gl.RGBA, gl.FLOAT, data);
    test.check(arraysEqual(data, expectedData),
        "Summed data from shader don't match expected sum\n"
        + "\nExpected:\n"
        + expectedData
        + "\nActual:\n"
        + data);
}

function testRealDataNormals(data1, data2) {
    let test = new Test("Show normals of read captured data (visual test only)");
    let [gl, programs, textures, framebuffers] = setupGraphics(test.canvas, realCameraParams);
    let width = realCameraParams.width;
    let height = realCameraParams.height;
    let canvas1 = document.createElement('canvas');
    test.div.appendChild(canvas1);

    let frame = 0;
    uploadDepthData(gl, textures, data1, width, height, frame);
    createModel(gl, programs, framebuffers, textures, frame, mat4.create());

    frame = 1;
    uploadDepthData(gl, textures, data2, width, height, frame);

    program = programs.points;
    gl.useProgram(program);
    let l = gl.getUniformLocation(program, 'cubeTexture');
    gl.uniform1i(l, textures.cube[frame%2].glId);
    l = gl.getUniformLocation(program, 'depthTexture');
    gl.uniform1i(l, textures.depth[frame%2].glId);
    l = gl.getUniformLocation(program, 'previousDepthTexture');
    gl.uniform1i(l, textures.depth[(frame+1)%2].glId);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.points);
    gl.viewport(0, 0, textures.points.normal.width,
        textures.points.normal.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    let stride = 4;
    const d = new Float32Array(width*height*stride);
    gl.readBuffer(gl.COLOR_ATTACHMENT1);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, d);
    d.width = width;
    d.height = height;
    showNormals(canvas1, d);
}

function testRealData(data) {
    let test = new Test("Test motion estimation for real data (visual test only)");
    test.showCanvas();
    test.bindMouseToCanvas();
    let width = realCameraParams.width;
    let height = realCameraParams.height;
    let [gl, programs, textures, framebuffers] = setupGraphics(test.canvas, realCameraParams);
    let globalMovement = mat4.create();
    let globalMovementInv = mat4.create();
    let frame = 0;
    uploadDepthData(gl, textures, data[frame], width, height, frame);
    createModel(gl, programs, framebuffers, textures, frame, mat4.create());

    frame = 1;
    uploadDepthData(gl, textures, data[frame], width, height, frame);
    let movement, info;
    [movement, info] = estimateMovement(gl, programs, textures, framebuffers, frame, 40);
    mat4.mul(globalMovement, globalMovement, movement);
    mat4.invert(globalMovementInv, globalMovement);
    createModel(gl, programs, framebuffers, textures, frame, globalMovementInv);
    console.log("error", info["error"]);
    console.log("relative error", info["error"]/info["pointsUsed"]);
    console.log("used points", info["pointsUsed"]);

    frame = 2;
    uploadDepthData(gl, textures, data[frame], width, height, frame);
    [movement, info] = estimateMovement(gl, programs, textures, framebuffers, frame, 40);
    mat4.mul(globalMovement, globalMovement, movement);
    globalMovementInv = mat4.create();
    mat4.invert(globalMovementInv, globalMovement);
    createModel(gl, programs, framebuffers, textures, frame, globalMovementInv);
    console.log("error", info["error"]);
    console.log("relative error", info["error"]/info["pointsUsed"]);
    console.log("used points", info["pointsUsed"]);

    frame = 3;
    uploadDepthData(gl, textures, data[frame], width, height, frame);
    [movement, info] = estimateMovement(gl, programs, textures, framebuffers, frame, 40);
    mat4.mul(globalMovement, globalMovement, movement);
    globalMovementInv = mat4.create();
    mat4.invert(globalMovementInv, globalMovement);
    createModel(gl, programs, framebuffers, textures, frame, globalMovementInv);
    console.log("error", info["error"]);
    console.log("relative error", info["error"]/info["pointsUsed"]);
    console.log("used points", info["pointsUsed"]);

    frame = 4;
    uploadDepthData(gl, textures, data[frame], width, height, frame);
    [movement, info] = estimateMovement(gl, programs, textures, framebuffers, frame, 40);
    mat4.mul(globalMovement, globalMovement, movement);
    globalMovementInv = mat4.create();
    mat4.invert(globalMovementInv, globalMovement);
    createModel(gl, programs, framebuffers, textures, frame, globalMovementInv);
    console.log("error", info["error"]);
    console.log("relative error", info["error"]/info["pointsUsed"]);
    console.log("used points", info["pointsUsed"]);
    let animate = function () {
        renderModel(gl, programs, textures, frame, test.canvas);
        window.requestAnimationFrame(animate);
    };
    animate();
}

function testMain() {
    let data1Canvas = document.getElementById('data1');
    let data2Canvas = document.getElementById('data2');
    let realData1Canvas = document.getElementById('realdata1');
    let realData2Canvas = document.getElementById('realdata2');
    let normals1Canvas = document.getElementById('normals1');
    let normals2Canvas = document.getElementById('normals2');
    showDepthData(data1Canvas, frame0);
    showDepthData(data2Canvas, frame1);
    try {
        let t0 = performance.now();
        testIndexCoordCoversion();
        testCorrespondingPointCPU();
        testNumberOfUsedPointsSameFrame();
        compareCorrespondingPointsVersions();
        compareEquationsBetweenVersions();
        testCPUMovementEstimationIdentity();
        testCPUMovementEstimation();
        testMovementEstimationIdentity();
        testMovementEstimation();
        testSumShaderSinglePass();
        testSumShader();
        testPointsShaderNormals();
        Promise.all([getImageData(realFrameUrl + "frame0.png"),
                     getImageData(realFrameUrl + "frame1.png"),
                     getImageData(realFrameUrl + "frame2.png"),
                     getImageData(realFrameUrl + "frame3.png"),
                     getImageData(realFrameUrl + "frame4.png")])
            .then(results => {
                // showDepthData(realData1Canvas,
                //     results[0], realCameraParams.depthScale);
                // showDepthData(realData2Canvas,
                //     results[1], realCameraParams.depthScale);
                testRealData(results);
                testRealDataNormals(results[0], results[1],);
            });
        // This test needs to be last, otherwise there might not be enough GPU
        // memory to create all the resources for all tests (the other tests
        // have their GL context deallocated once they are done, but this one
        // keeps running).
        testVolumetricModel();
        let t1 = performance.now();
        console.log("Blocking part of tests took " + (t1 - t0)
                  + " milliseconds.")
    } catch (e) {
        handleError(e);
    }
}
