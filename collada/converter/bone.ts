class ColladaConverterBone {
    index: number;
    node: ColladaConverterNode;
    name: string;
    parent: ColladaConverterBone;
    animated: boolean;
    attachedToSkin: boolean;
    invBindMatrix: Mat4;

    constructor(node: ColladaConverterNode, jointSid: string, index: number) {
        this.node = node;
        this.name = jointSid;
        this.index = index;
        this.parent = null;
        this.attachedToSkin = false;
        this.animated = false;
        this.invBindMatrix = mat4.create();
    }

    parentIndex(): number {
        return this.parent === null ? -1 : this.parent.index;
    }

    /**
    * Finds the visual scene node that is referenced by the joint SID.
    * The skin element contains the skeleton root nodes.
    */
    static findBoneNode(boneSid: string, skeletonRootNodes: ColladaVisualSceneNode[], context: ColladaConverterContext): ColladaVisualSceneNode {
        // The spec is inconsistent here.
        // The joint ids do not seem to be real scoped identifiers(chapter 3.3, "COLLADA Target Addressing"), since they lack the first part (the anchor id)
        // The skin element(chapter 5, "skin" element) * implies * that the joint ids are scoped identifiers relative to the skeleton root node,
        // so perform a sid - like breadth - first search.
        var boneNode: ColladaElement = null;
        for (var i: number = 0; i < skeletonRootNodes.length; i++) {
            var skeletonRoot: ColladaVisualSceneNode = skeletonRootNodes[i];
            var sids: string[] = boneSid.split("/");
            boneNode = SidLink.findSidTarget(boneSid, skeletonRoot, sids, context);
            if (boneNode != null) {
                break;
            }
        }
        if (boneNode instanceof ColladaVisualSceneNode) {
            return <ColladaVisualSceneNode> boneNode;
        } else {
            context.log.write("Joint " + boneSid + " does not point to a visual scene node, joint ignored", LogLevel.Warning);
            return null;
        }
    }

    /**
    * Creates a new bone and adds it to the given list of bones
    */
    static createBone(node: ColladaConverterNode, jointSid: string, bones: ColladaConverterBone[], context: ColladaConverterContext): ColladaConverterBone {
        var bone: ColladaConverterBone = new ColladaConverterBone(node, jointSid, bones.length);
        return bone;
    }

    /**
    * Find the parent for each bone
    * The skeleton(s) may contain more bones than referenced by the skin
    * This function also adds all bones that are not referenced but used for the skeleton transformation
    */
    static findBoneParents(bones: ColladaConverterBone[], context: ColladaConverterContext) {
        var i: number = 0;
        // The bones array will grow during traversal, therefore the while loop
        while (i < bones.length) {
            // Select the next unprocessed bone
            var bone: ColladaConverterBone = bones[i];
            i = i + 1;

            // Find a bone that corresponds to this bone's node parent
            for (var k: number = 0; k < bones.length; k++) {
                var parentBone: ColladaConverterBone = bones[k];
                if (bone.node.parent === parentBone.node) {
                    bone.parent = parentBone;
                    break;
                }
            }

            // If no parent bone found, add it to the list
            if ((bone.node.parent != null) && (bone.parent == null)) {
                bone.parent = ColladaConverterBone.createBone(bone.node.parent, "", bones, context);
            }
        }
    }
    
    /**
    * Create all bones used in the given skin
    */
    static createSkinBones(jointSids: string[], skeletonRootNodes: ColladaVisualSceneNode[], bindShapeMatrix: Mat4, invBindMatrices: Float32Array, context: ColladaConverterContext): ColladaConverterBone[]{
        var bones: ColladaConverterBone[] = [];

        // Add all bones referenced by the skin
        for (var i: number = 0; i < jointSids.length; i++) {
            var jointSid: string = jointSids[i];
            var jointNode: ColladaVisualSceneNode = ColladaConverterBone.findBoneNode(jointSid, skeletonRootNodes, context);
            if (jointNode === null) {
                context.log.write("Joint " + jointSid + " not found for skeleton, no bones created", LogLevel.Warning);
                return [];
            }
            var converterNode: ColladaConverterNode = context.findNode(jointNode);
            if (converterNode === null) {
                context.log.write("Joint " + jointSid + " not converted for skeleton, no bones created", LogLevel.Warning);
                return [];
            }
            var bone: ColladaConverterBone = ColladaConverterBone.createBone(converterNode, jointSid, bones, context);
            bone.attachedToSkin = true;

            // Collada skinning equation: boneWeight*boneMatrix*invBindMatrix*bindShapeMatrix*vertexPos
            // (see chapter 4: "Skin Deformation (or Skinning) in COLLADA")
            // Here we are pre-multiplying the inverse bind matrix and the bind shape matrix
            ColladaMath.mat4Extract(invBindMatrices, bone.index, bone.invBindMatrix);
            mat4.multiply(bone.invBindMatrix, bone.invBindMatrix, bindShapeMatrix);
            bones.push(bone);
        }

        // Add all missing bones of the skeleton
        ColladaConverterBone.findBoneParents(bones, context);

        return bones;
    }
}