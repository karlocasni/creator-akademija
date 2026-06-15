const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
  projectId: "creator-akademija"
});

async function run() {
  try {
    const auth = getAuth();
    let uid;
    try {
      const user = await auth.getUserByEmail("ismael.hadzic17@gmail.com");
      uid = user.uid;
      await auth.updateUser(uid, {
        password: "isokiso18"
      });
      console.log("Successfully updated Ismael's password!");
    } catch(e) {
      if (e.code === 'auth/user-not-found') {
        const newUser = await auth.createUser({
          email: "ismael.hadzic17@gmail.com",
          password: "isokiso18",
          displayName: "Ismael Hadžić"
        });
        uid = newUser.uid;
        console.log("Created Ismael's Auth User!");
      } else {
        throw e;
      }
    }
    
    const db = getFirestore();
    await db.collection("profiles").doc(uid).set({
      isAdmin: true,
      isCreator: true,
      email: "ismael.hadzic17@gmail.com",
      username: "Ismael Hadžić"
    }, { merge: true });
    console.log("Successfully updated Ismael's profile!");
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
