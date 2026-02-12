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

import * as admin from "firebase-admin";
import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { beforeUserCreated } from "firebase-functions/v2/identity";

admin.initializeApp();

/**
 * When an admin creates a document at `approvedUsers/{uid}`,
 * set the `approved` custom claim on that user.
 */
export const onApproveUser = onDocumentCreated(
  "approvedUsers/{uid}",
  async (event) => {
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
    } catch (err) {
      console.error(`Failed to approve user ${uid}:`, err);
    }
  }
);

/**
 * When an admin deletes the document at `approvedUsers/{uid}`,
 * revoke the `approved` custom claim from that user.
 */
export const onRevokeUser = onDocumentDeleted(
  "approvedUsers/{uid}",
  async (event) => {
    const uid = event.params.uid;
    if (!uid) {
      console.error("No UID in document path");
      return;
    }

    try {
      // Remove the approved claim
      await admin.auth().setCustomUserClaims(uid, { approved: false });
      console.log(`✗ Revoked approval for user ${uid}`);
    } catch (err) {
      console.error(`Failed to revoke user ${uid}:`, err);
    }
  }
);

/**
 * When a new user signs up, create a pending entry in `pendingUsers`
 * so the admin can see who needs approval.
 */
export const onUserCreated = beforeUserCreated(async (event) => {
  const user = event.data;
  if (!user) return;

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
  } catch (err) {
    console.error(`Failed to create pending entry for ${user.uid}:`, err);
  }
});
