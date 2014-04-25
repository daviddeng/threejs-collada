/// <reference path="external/gl-matrix.d.ts" />

declare var glMatrix: glMatrixStatic;
var mat3 = glMatrix.mat3;
var mat4 = glMatrix.mat4;
var vec2 = glMatrix.vec2;
var vec3 = glMatrix.vec3;
var vec4 = glMatrix.vec4;
var quat = glMatrix.quat;

interface NumberArray {
    length: number;
    [index: number]: number;
}

class ColladaMath {
    contructor() {
    }

    static TO_RADIANS: number = Math.PI / 180.0;

    /**
    * Extracts a 3D vector from an array of vectors (stored as an array of numbers)
    */
    static vec3Extract(src: NumberArray, srcOff: number, dest: Vec3) {
        dest[0] = src[srcOff * 3 + 0];
        dest[1] = src[srcOff * 3 + 1];
        dest[2] = src[srcOff * 3 + 2];
    }

    /**
    * Extracts a 4D matrix from an array of matrices (stored as an array of numbers)
    */
    static mat4Extract(src: NumberArray, srcOff: number, dest: Mat4) {
        for (var i: number = 0; i < 16; ++i) {
                dest[i] = src[srcOff * 16 + i];
        }
        // Collada matrices are row major
        // glMatrix matrices are column major
        mat4.transpose(dest, dest);
    }

    /**
    * Converts a glMatrix matrix to a plain array
    */
    static mat4ToJSON(a: Mat4): number[]{
        return [
            a[ 0], a[ 1], a[ 2], a[ 3],
            a[ 4], a[ 5], a[ 6], a[ 7],
            a[ 8], a[ 9], a[10], a[11],
            a[12], a[13], a[14], a[15]
            ];
    }

    static decompose(mat: Mat4, pos: Vec3, rot: Quat, scl: Vec3) {
        var tempMat3: Mat3 = mat3.create();

        // Translation
        vec3.fromValues(mat[12], mat[13], mat[14]);

        // Rotation
        mat3.normalFromMat4(tempMat3, mat);
        quat.fromMat3(rot, tempMat3);

        // Scale
        scl[0] = vec3.length(vec3.fromValues(mat[0], mat[1], mat[2]));
        scl[1] = vec3.length(vec3.fromValues(mat[4], mat[5], mat[6]));
        scl[2] = vec3.length(vec3.fromValues(mat[8], mat[9], mat[10]));
    }
};