import { updateProfile } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { doc, setDoc, getDoc, collection, addDoc, onSnapshot  } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { auth, db } from "/Pataanguna/firebaseConf.js";
import { changeUserPassword, deleteUserAccount } from "./authFunctions.js";

let profileFormInitialized = false;

// 🔹 Function to handle profile picture upload
export function handleProfilePicUpload(event) {
    return new Promise((resolve, reject) => {
        const file = event.target.files[0];
        if (!file) return resolve(null);

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            alert("Only JPG, PNG, or GIF images are allowed");
            event.target.value = '';
            return reject("Invalid file type");
        }

        // Validate image size (max 500KB)
        if (file.size > 500000) {
            alert("Image must be smaller than 500KB");
            event.target.value = '';
            return reject("Image too large");
        }

        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Ensure the result is properly formatted
            const base64Prefix = `data:${file.type};base64,`;
            let result = e.target.result;
            
            // Ensure proper base64 prefix
            if (!result.startsWith(base64Prefix)) {
                result = base64Prefix + result.split(',')[1];
            }

            const profilePreview = document.getElementById("profilePreview");
            if (profilePreview) {
                profilePreview.src = result;
                profilePreview.style.display = "block";
            }
            resolve(result);
        };
        
        reader.onerror = () => {
            event.target.value = '';
            reject("Error reading file");
        };
        
        reader.readAsDataURL(file);
    });
}

// 🔹 Function to handle profile update
export async function updateUserProfile(fullName, username, location, dob, profilePicture = null) {
    const user = auth.currentUser;
    if (!user) {
        alert("User not signed in.");
        return false;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const updateData = {
            fullName,
            username,
            location,
            dob,
            updatedAt: new Date() // Add timestamp to force refresh
        };

        // Only update profilePicture if a new one was provided
        if (profilePicture) {
            if (!profilePicture.startsWith('data:image')) {
                console.error("Invalid image format being saved");
                return false;
            }
            updateData.profilePicture = profilePicture;
        }

        await setDoc(userRef, updateData, { merge: true });
        await updateProfile(user, { displayName: username });

        // Force refresh all auth state listeners
        await auth.currentUser.reload();
        
        alert("Profile updated successfully!");
        return true;
    } catch (error) {
        console.error("Update error:", error);
        alert("Failed to update profile: " + error.message);
        return false;
    }
}

// 🔹 Function to load user data
export async function loadUserData(user) {
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();

            // Populate form fields
            const fullNameInput = document.getElementById("newFName");
            const userNameInput = document.getElementById("newUsName");
            const locationInput = document.getElementById("newProvinsi");
            const dobInput = document.getElementById("newDob");
            const profilePreview = document.getElementById("profilePreview");

            if (fullNameInput) fullNameInput.value = userData.fullName || "";
            if (userNameInput) userNameInput.value = userData.username || "";
            if (locationInput) locationInput.value = userData.location || "";
            if (dobInput) dobInput.value = userData.dob || "";
            if (profilePreview && userData.profilePicture) {
                profilePreview.src = userData.profilePicture;
                profilePreview.style.display = "block";
            }
        } else {
            console.log("No user data found in Firestore.");
        }
    } catch (error) {
        console.error("Error loading user data:", error);
    }
}

export function uploadImage(event, expert) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        expert.image = reader.result;
    };
    reader.onerror = (error) => {
        console.error("Error reading file:", error);
    };
}

// 🔹 Function to handle form submission
export function setupProfileForm() {
    return new Promise((resolve) => {
        if (profileFormInitialized) {
            return resolve(false); // Already initialized
        }
        profileFormInitialized = true;

        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                // Only redirect if we're not already on index page
                if (!window.location.pathname.endsWith('index.html')) {
                    window.location.href = '/index.html';
                }
                return resolve(false);
            }

            try {
                await loadUserData(user);

                // Handle picture upload
                let newProfilePicture = null;
                const uploadInput = document.getElementById("profilePicUpload");
                if (uploadInput && !uploadInput.hasListener) {
                    uploadInput.hasListener = true;
                    uploadInput.addEventListener("change", async (e) => {
                        try {
                            newProfilePicture = await handleProfilePicUpload(e);
                        } catch (error) {
                            console.error("Upload error:", error);
                            e.target.value = '';
                        }
                    });
                }
                
                // Handle form submission
                const profileForm = document.getElementById("profileForm");
                if (profileForm && !profileForm.hasListener) {
                    profileForm.hasListener = true;
                    profileForm.addEventListener("submit", async (e) => {
                        e.preventDefault();
                        
                        const fullName = document.getElementById("newFName").value;
                        const username = document.getElementById("newUsName").value;
                        const location = document.getElementById("newProvinsi").value;
                        const dob = document.getElementById("newDob").value;

                        const success = await updateUserProfile(
                            fullName,
                            username,
                            location,
                            dob,
                            newProfilePicture
                        );

                        if (success) {
                            alert("Profile updated successfully!");
                        }
                    });
                }

                resolve(true);
            } catch (error) {
                console.error("Profile setup error:", error);
                resolve(false);
            } finally {
                unsubscribe(); // Clean up the auth listener
            }
        });
    });
}

// In your DOMContentLoaded handler:
document.addEventListener("DOMContentLoaded", () => {
    // Handle password form
    const passwordForm = document.getElementById("securityForm");
    if (passwordForm && !passwordForm.hasListener) {
        passwordForm.hasListener = true;
        passwordForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const oldPwd = document.getElementById("oldPwd")?.value;
            const newPwd = document.getElementById("newPwd")?.value;
            const confirmPwd = passwordForm.querySelector("input[placeholder='Confirm new password']")?.value;

            if (!oldPwd || !newPwd || !confirmPwd) {
                alert("Please fill in all password fields!");
                return;
            }

            if (newPwd.length < 8) {
                alert("Password must be at least 8 characters long");
                return;
            }

            if (!/[A-Z]/.test(newPwd)) {
                alert("Password must contain at least one uppercase letter");
                return;
            }

            if (!/[0-9]/.test(newPwd)) {
                alert("Password must contain at least one number");
                return;
            }

            if (newPwd !== confirmPwd) {
                alert("New passwords do not match!");
                return;
            }

            try {
                await changeUserPassword(oldPwd, newPwd);
            } catch (error) {
                if (error.code === "auth/wrong-password") {
                    alert("Current password is incorrect");
                } else {
                    alert("Error changing password: " + error.message);
                }
            }
        });
    }

    const deleteButton = document.querySelector(".btn-danger");
    if (deleteButton && !deleteButton.hasListener) {
        deleteButton.hasListener = true;
        deleteButton.addEventListener("click", () => {
            const modal = new bootstrap.Modal(document.getElementById('deleteAccountModal'));
            modal.show();
            
            document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
                const password = document.getElementById('deletePassword').value;
                if (!password) {
                    alert("Please enter your password");
                    return;
                }
                
                try {
                    await deleteUserAccount(password);
                    modal.hide();
                } catch (error) {
                    alert("Error deleting account: " + error.message);
                }
            });
        });
    }

    setupProfileForm().then((success) => {
        if (!success) {
            console.log("Profile setup failed or user not authenticated");
        }
    });
});



