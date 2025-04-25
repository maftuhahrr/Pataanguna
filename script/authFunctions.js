import { auth, db } from "/Pataanguna/firebaseConf.js";
import { addNotification } from "./notificationFunctions.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser,} 
    from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { doc, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Function to register a user
export async function registerUser(email, password, confirmPassword, username, location, dob) {
    if (!email || !password || !username || !location || !dob || !fullName) {
        alert("Harap isi semua kolom!");
        return;
    }
    if (password.length < 6) {
        alert("Password harus minimal 6 karakter!");
        return;
    }
    if (password !== confirmPassword) {
        alert("Konfirmasi password tidak cocok!");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: username });

        await setDoc(doc(db, "users", user.uid), {
            fullName, // Add fullName here (or use a separate input for fullName)
            username,
            location,
            dob,
            email,
            isExpert: false,
            role: "user", // ✅ Set default role as "user"
            profilePicture: ""
        });

        alert("Akun berhasil terdaftar!");
        document.getElementById("logRegForm").style.display = "none";
    } catch (error) {
        alert(error.message);
    }
}

// Function to login a user
export async function loginUser(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        document.getElementById("signedInNav").style.display = "flex";
        document.getElementById("signedOutNav").style.display = "none"
        alert("Selamat Datang!!!");
        document.getElementById("logRegForm").style.display = "none";
    } catch (error) {
        alert(error.message);
    }
}

// Function to logout a user
export async function logoutUser() {
    try {
        await signOut(auth);
        alert("Sampai Jumpa!!");
        window.location.href = '/index.html';
    } catch (error) {
        alert(error.message);
    }
}

export async function checkUserRole(appInstance) {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                console.log("No user logged in.");
                appInstance.isAdmin = false;
                appInstance.isExpert = false;
                resolve(false);
                return;
            }

            try {
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    console.log("User data from Firestore:", userData);
                    
                    appInstance.isAdmin = userData.role === "admin";
                    appInstance.isExpert = !!userData.isExpert;
                    
                    console.log("Roles set:", {
                        isAdmin: appInstance.isAdmin,
                        isExpert: appInstance.isExpert
                    });
                    
                    resolve(true);
                } else {
                    console.log("User document not found in Firestore.");
                    appInstance.isAdmin = false;
                    appInstance.isExpert = false;
                    resolve(false);
                }
            } catch (error) {
                console.error("Error checking user role:", error);
                appInstance.isAdmin = false;
                appInstance.isExpert = false;
                resolve(false);
            }
        });
    });
}

export async function changeUserPassword(oldPassword, newPassword) {
    const user = auth.currentUser;
    if (!user) {
        alert("No user is signed in.");
        return;
    }

    if (newPassword.length < 6) {
        alert("Password harus minimal 6 karakter.");
        return;
    }

    try {
        // Reauthenticate the user before changing password
        const credential = EmailAuthProvider.credential(user.email, oldPassword);
        await reauthenticateWithCredential(user, credential);

        // Update the password
        await updatePassword(user, newPassword);
        alert("Password berhasil diubah!");

        await addNotification(user.uid, "Password Diubah", "Akun password anda telah berubah.");
        window.location.href = '/index.html';
    } catch (error) {
        alert("Error: " + error.message);
    }
}

// Attach event listeners
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("submitReg").addEventListener("click", async (e) => {
        e.preventDefault();
        const email = document.getElementById("mail").value;
        const password = document.getElementById("pwd").value;
        const confirmPassword = document.querySelector("input[name='confirm-password']").value;
        const username = document.getElementById("usName").value;
        const fullName = document.getElementById("fName").value;
        const location = document.getElementById("provinsi").value;
        const dob = document.getElementById("dob").value;
        
        registerUser(email, password, confirmPassword, username, location, dob, fullName);
    });
    
    document.getElementById("login").addEventListener("click", async (e) => {
        e.preventDefault();
        const email = document.getElementById("logMail").value;
        const password = document.getElementById("logPwd").value;
        loginUser(email, password);
    });

    document.getElementById("logoutBtn").addEventListener("click", async (e) => {
        e.preventDefault();
        logoutUser();
    });
});

export async function deleteUserAccount(password) {
    const user = auth.currentUser;
    if (!user) {
        alert("No user is signed in.");
        return;
    }

    try {
        // Reauthenticate the user
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);

        // Delete user's Firestore data
        await deleteDoc(doc(db, "users", user.uid));

        // Delete the Firebase Authentication user
        await deleteUser(user);

        alert("Your account has been deleted successfully.");
        window.location.href = "/index.html"; // Redirect to home page after deletion
    } catch (error) {
        alert("Error deleting account: " + error.message);
    }
}
