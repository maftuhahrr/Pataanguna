import { auth, db } from "./firebaseConf.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { doc, getDoc,  } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { loadNotifications } from "./script/notificationFunctions.js";
import { loadEvents } from "./script/eventFunctions.js";

function calculateAge(birthdate) {
    if (!birthdate) {
      return "Unknown"; // Handle cases where birthdate is missing
    }
  
    const birthDateObj = new Date(birthdate); // Convert to Date object
    const today = new Date();
  
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
  
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
  
    return age;
}

// 🔹 Handle authentication state changes
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById("signedInNav").style.display = "flex";
        document.getElementById("signedOutNav").style.display = "none";

        const usernameDisplay = document.getElementById("usernameDisplay");
        const userLocation = document.getElementById("userLocation");
        const userAge = document.getElementById("userAge");
        const userEmail = document.getElementById("emailDisplay");
        const userFName = document.getElementById("fullNameDisplay");
        const profilePic = document.getElementById("profilePic"); // Get these elements early
        const profileIcon = document.getElementById("profileIcon");

        // 🔹 Get user details from Firestore and update profile image immediately
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();

                // Update profile picture in navbar - Moved this block up
                if (profilePic && userData.profilePicture) {
                    if (isValidBase64(userData.profilePicture)) {
                        profilePic.src = userData.profilePicture;
                        profilePic.style.display = "block";
                        if (profileIcon) profileIcon.style.display = "none";
                    } else {
                        console.error("Invalid base64 image data");
                        if (profilePic) profilePic.style.display = "none";
                        if (profileIcon) profileIcon.style.display = "block";
                    }
                } else {
                    if (profilePic) profilePic.style.display = "none";
                    if (profileIcon) profileIcon.style.display = "block";
                }

                // Update other user info
                if (usernameDisplay) usernameDisplay.textContent = userData.username || "Profile";
                if (userLocation) userLocation.textContent = userData.location || "Unknown";
                if (userAge) userAge.textContent = `${calculateAge(userData.dob)} tahun`;
                if (userEmail) userEmail.textContent = userData.email || "Unknown";
                if (userFName) userFName.textContent = userData.fullName || "Unknown";
                if (userData.notificationPreferences) {
                    console.log("Notification preferences loaded:", userData.notificationPreferences);
                }

                // 🔹 Load additional data that might depend on userData
                loadNotifications(user.uid);
                if (window.vueApp && typeof window.vueApp.setupForumListeners === 'function') {
                    window.vueApp.setupForumListeners();
                }
                if (userData) {
                    loadEvents(userData); // Pass userData to loadEvents if it's valid
                } else {
                    console.warn("User document does not exist or could not be fetched.");
                }

                checkWorkshopStatus(); // Keep these here as they might depend on the user being logged in
                setInterval(checkWorkshopStatus, 60 * 1000);

            } else {
                console.warn("User document does not exist.");
                // Handle the case where the user exists in auth but not in Firestore
                if (profilePic) profilePic.style.display = "none";
                if (profileIcon) profileIcon.style.display = "block";
            }
        } catch (error) {
            console.error("Error loading user data:", error);
            if (profilePic) profilePic.style.display = "none";
            if (profileIcon) profileIcon.style.display = "block";
        }
    } else {
        document.getElementById("signedInNav").style.display = "none";
        document.getElementById("signedOutNav").style.display = "flex";
        console.warn("User is NOT authenticated. Cannot fetch user data.");
    }
});

// Placeholder function for workshop status checking
function checkWorkshopStatus() {
    console.log("Checking workshop status...");
}

function isValidBase64(str) {
    try {
        // Check if it's a data URL
        if (str.startsWith('data:image')) {
            // Basic pattern check for base64 data URLs
            const pattern = /^data:image\/(png|jpeg|jpg|gif);base64,[a-zA-Z0-9+/]+={0,2}$/;
            return pattern.test(str);
        }
        return false;
    } catch (e) {
        return false;
    }
}
