"use strict";
// ============================================================
// Cloud Functions - Admin approval system for Bound
// ============================================================
//
// Architecture:
//   - Firestore collection `approvedUsers/{uid}` acts as the approval list
//   - onApproveUser: When a doc is created in approvedUsers, set custom claim `approved: true`
//   - onRevokeUser:  When a doc is deleted from approvedUsers, remove the `approved` claim
//   - onUserCreated: When a new user signs up, log it (admin can then approve)
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserCreated = exports.onRevokeUser = exports.onApproveUser = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const identity_1 = require("firebase-functions/v2/identity");
admin.initializeApp();
/**
 * When an admin creates a document at `approvedUsers/{uid}`,
 * set the `approved` custom claim on that user.
 */
exports.onApproveUser = (0, firestore_1.onDocumentCreated)("approvedUsers/{uid}", async (event) => {
    const uid = event.params.uid;
    if (!uid) {
        console.error("No UID in document path");
        return;
    }
    try {
        await admin.auth().setCustomUserClaims(uid, { approved: true });
        console.log(`✓ Approved user ${uid}`);
        // Optionally update the document with approval timestamp
        await admin
            .firestore()
            .doc(`approvedUsers/${uid}`)
            .update({
            approvedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "approved",
        });
    }
    catch (err) {
        console.error(`Failed to approve user ${uid}:`, err);
    }
});
/**
 * When an admin deletes the document at `approvedUsers/{uid}`,
 * revoke the `approved` custom claim from that user.
 */
exports.onRevokeUser = (0, firestore_1.onDocumentDeleted)("approvedUsers/{uid}", async (event) => {
    const uid = event.params.uid;
    if (!uid) {
        console.error("No UID in document path");
        return;
    }
    try {
        // Remove the approved claim
        await admin.auth().setCustomUserClaims(uid, { approved: false });
        console.log(`✗ Revoked approval for user ${uid}`);
    }
    catch (err) {
        console.error(`Failed to revoke user ${uid}:`, err);
    }
});
/**
 * When a new user signs up, create a pending entry in `pendingUsers`
 * so the admin can see who needs approval.
 */
exports.onUserCreated = (0, identity_1.beforeUserCreated)(async (event) => {
    const user = event.data;
    if (!user)
        return;
    try {
        await admin
            .firestore()
            .doc(`pendingUsers/${user.uid}`)
            .set({
            uid: user.uid,
            email: user.email || null,
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            provider: user.providerData?.[0]?.providerId || "unknown",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "pending",
        });
        console.log(`New user registered: ${user.email || user.uid}`);
    }
    catch (err) {
        console.error(`Failed to create pending entry for ${user.uid}:`, err);
    }
});
//# sourceMappingURL=index.js.map