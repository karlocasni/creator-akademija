const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

async function run() {
  try {
    const user = await admin.auth().getUserByEmail("ismael.hadzic17@gmail.com");
    await admin.auth().updateUser(user.uid, {
      password: "isokiso18"
    });
    console.log("Successfully updated Ismael's password!");
    
    // Also ensure he's an admin in profiles
    const db = admin.firestore();
    await db.collection("profiles").doc(user.uid).set({
      isAdmin: true,
      isCreator: true
    }, { merge: true });
    console.log("Successfully updated Ismael's profile!");
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
