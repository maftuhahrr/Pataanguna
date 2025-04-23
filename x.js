import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, EmailAuthProvider, reauthenticateWithCredential } 
    from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, orderBy, onSnapshot, where, updateDoc, getDocs, limit, startAfter  } 
    from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCBpwb6L3R-wWG18w8H4cXJb7awyXt5AbA",
    authDomain: "pataanguna.firebaseapp.com",
    projectId: "pataanguna",
    storageBucket: "pataanguna.firebasestorage.app",
    messagingSenderId: "953275928559",
    appId: "1:953275928559:web:414e56933da4f0ef58b01a",
    measurementId: "G-P79P8KV1Q8"
};

document.addEventListener("DOMContentLoaded", function () {
    // 🔹 Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    window.db = db;
    const user = getAuth().currentUser;

    // 🔹 Get elements safely
    const regis = document.getElementById("submitReg");
    const login = document.getElementById("login");
    const logout = document.getElementById("logoutBtn");
    const profileForm = document.getElementById("profileForm");
    const securityForm = document.getElementById("security");
    const profilePicUpload = document.getElementById("profilePicUpload");
    const tambahButton = document.getElementById("tambahForum");
    const confirmRegisterButton = document.getElementById("confirmRegisterButton");
    const registerButton = document.getElementById("registerButton");
    const registerModalEl = document.getElementById("workshopModal");
    const workshopModal = new bootstrap.Modal(document.getElementById('workshopManageModal'));
    const eventModalEl = document.getElementById("workshopManageModal");
    const eventModal = new bootstrap.Modal(eventModalEl); 
    const eventTitleInput = document.getElementById("eventTitle");
    const eventDateInput = document.getElementById("eventDate");
    const eventDescInput = document.querySelector(".eventDesc");
    const eventImageInput = document.querySelector("#workshopManageModal input[type='file']");
    const eventImagePreview = document.querySelector("#workshopManageModal img");
    const saveEventBtn = document.getElementById("saveEventBtn");
    let selectedImageFile = null; // Store the selected file

    if (!registerModalEl) {
        console.warn("workshopModal element not found! Skipping modal initialization.");
    } else {
        var registerModal = new bootstrap.Modal(registerModalEl);
    }

    const workshopDate = "2025-11-27";
    const workshopTime = "14:00";
    const meetingLink = "https://meet.google.com";
    

    // 🔹 Add event listeners only if elements exist
    if (regis) {
        regis.addEventListener("click", async function (event) {
            event.preventDefault();
    
            const email = document.getElementById("mail").value.trim();
            const password = document.getElementById("pwd").value.trim();
            const confirmPassword = document.querySelector("input[name='confirm-password']").value.trim();
            const username = document.getElementById("usName").value.trim();
            const dob = document.getElementById("dob").value;
            const age = calculateAge(dob);
    
            // 🔹 Validate input fields
            if (!email || !password || !username || !location || !dob) {
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
                    username,
                    location,
                    dob,
                    age,
                    email,
                    profilePicture: ""
                });
    
                alert("Akun berhasil terdaftar!");
                document.getElementById("logRegForm").style.display = "none";
            } catch (error) {
                alert(error.message);
            }
        });
    }    
    
    if (login) {
        login.addEventListener("click", async function (event) {
            event.preventDefault();

            const email = document.getElementById("logMail").value;
            const password = document.getElementById("logPwd").value;

            try {
                await signInWithEmailAndPassword(auth, email, password);
                alert("Selamat Datang!!!");
                document.getElementById("logRegForm").style.display = "none";
            } catch (error) {
                alert(error.message);
            }
        });
    }

    if (logout) {
        logout.addEventListener("click", async function (event) {
            event.preventDefault();
            try {
                await signOut(auth);
                alert("Sampai Jumpa!!");
            } catch (error) {
                alert(error.message);
            }
        });
    }

    if (document.getElementById("profilePicUpload")) {
        document.getElementById("profilePicUpload").addEventListener("change", function (event) {
            const file = event.target.files[0];
            if (!file) return;
    
            const reader = new FileReader();
            reader.onload = function (e) {
                const profilePreview = document.getElementById("profilePreview");
                if (profilePreview) {
                    profilePreview.src = e.target.result;
                    profilePreview.style.display = "block";
                }
            };
            reader.readAsDataURL(file);
        });
    }    

    if (profileForm) {
        profileForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const user = auth.currentUser;
            if (!user) {
                alert("User not signed in.");
                return;
            }

            const fullName = document.getElementById("newFName").value;
            const username = document.getElementById("newUsName").value;
            const location = document.getElementById("newProvinsi").value;
            const dob = document.getElementById("newDob").value;
            const profilePic = document.getElementById("profilePreview").src;

            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, {
                fullName,
                username,
                location,
                dob,
                profilePicture: profilePic
            }, { merge: true });

            await updateProfile(user, { displayName: username });

            alert("Profil berhasil diperbarui!");
        });
    }

    if (securityForm) {
        securityForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const user = auth.currentUser;
            if (!user) {
                alert("User not signed in.");
                return;
            }

            const newPassword = document.getElementById("newPwd").value;
            if (newPassword) {
                try {
                    await updatePassword(user, newPassword);
                    alert("Password berhasil diperbarui!");
                } catch (error) {
                    alert("Error: " + error.message);
                }
            }
        });
    }

    if (tambahButton) {
        tambahButton.addEventListener("click", async function (event) {
            event.preventDefault();

            const titleInput = document.querySelector("input[placeholder='Judul Diskusi']");
            const descriptionInput = document.querySelector("textarea[placeholder='Deskripsi...']");

            const title = titleInput.value.trim();
            const description = descriptionInput.value.trim();

            if (title === "" || description === "") {
                alert("Judul dan deskripsi tidak boleh kosong!");
                return;
            }

            // 🔹 Call addForum function to save to Firestore
            await addForum(title, description);

            // 🔹 Clear input fields after submission
            titleInput.value = "";
            descriptionInput.value = "";
        });
    }

    // 🔹 Function to load user data
    async function loadUserData(user) {
        if (!user) return;

        const userSnap = await getDoc(doc(db, "users", user.uid));

        if (userSnap.exists()) {
        const userData = userSnap.data();
        console.log("User data:", userData);

        // 🔹 Check if each element exists before modifying its value
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
        }
    }

    async function addForum(title, description) {
        const user = auth.currentUser;
        
        if (!user) {
            alert("Anda harus login terlebih dahulu!");
            return;
        }
    
        try {
            await addDoc(collection(db, "forums"), {
                title,
                description,
                userId: user.uid,
                timestamp: new Date(),
            });
    
            alert("Topik diskusi berhasil ditambahkan!");
            loadForums(); // Reload the forums after adding a new one
        } catch (error) {
            console.error("Error adding forum:", error.message);
            alert("Gagal menambahkan topik diskusi: " + error.message);
        }
    }

    // 🔹 Function to load forums from Firestore
    let lastVisible = null; // Store last document for pagination

    async function loadForums() {
        const forumContainer = document.getElementById("forumContainer");
        if (!forumContainer) {
            console.error("Forum container not found!");
            return;
        }

        const q = query(collection(db, "forums"), orderBy("timestamp", "desc"), limit(5)); // Load only 5 at a time

        const snapshot = await getDocs(q);
        forumContainer.innerHTML = ""; // Clear previous topics

        snapshot.forEach((doc) => {
            const data = doc.data();
            const forumDiv = document.createElement("div");
            forumDiv.classList.add("forum-topic");
            forumDiv.innerHTML = `<strong>${data.title}</strong><p>${data.description}</p>`;
            forumContainer.appendChild(forumDiv);
        });

        lastVisible = snapshot.docs[snapshot.docs.length - 1]; // Set last document for pagination
    }

// Load more forums when clicking "Next Page"
    document.getElementById("nextPage").addEventListener("click", async function () {
        const forumContainer = document.getElementById("forumContainer");
        if (!lastVisible) return;

        const q = query(
            collection(db, "forums"),
            orderBy("timestamp", "desc"),
            startAfter(lastVisible),
            limit(5)
        );

        const snapshot = await getDocs(q);
        snapshot.forEach((doc) => {
            const data = doc.data();
            const forumDiv = document.createElement("div");
            forumDiv.classList.add("forum-topic");
            forumDiv.innerHTML = `<strong>${data.title}</strong><p>${data.description}</p>`;
            forumContainer.appendChild(forumDiv);
        });

        lastVisible = snapshot.docs[snapshot.docs.length - 1]; // Update for next pagination
    });

    async function addNotification(userId, title, message) {
        const db = getFirestore();
        try {
            await addDoc(collection(db, "notifications"), {
                userId,
                title,
                message,
                timestamp: new Date(),
                read: false,  // Mark as unread
            });
            console.log("Notification added successfully!");
        } catch (error) {
            console.error("Error adding notification:", error);
        }
    }
    
    // Example: Call this when a user completes a lesson
    function lessonCompleted(userId) {
        addNotification(userId, "Pelajaran Selesai!", "Jangan lupa lanjut ke materi berikutnya.");
    }
    
    // Example: Call this when a webinar is coming up
    function webinarReminder(userId) {
        addNotification(userId, "Webinar Segera Dimulai!", "Pastikan Anda tidak ketinggalan acara penting ini.");
    }
    
    // Example: Call this before a test
    function testReminder(userId) {
        addNotification(userId, "Waktunya Tes!", "Ayo uji pemahaman Anda sekarang.");
    }

    async function addForumReplyNotification(userId, forumTitle) {
        const db = getFirestore();
        try {
            await addDoc(collection(db, "notifications"), {
                userId,
                title: "Balasan Baru di Forum",
                message: `Diskusi "${forumTitle}" telah mendapat balasan baru.`,
                timestamp: new Date(),
                read: false,
            });
            console.log("Forum reply notification added!");
        } catch (error) {
            console.error("Error adding forum reply notification:", error);
        }
    }
    
    // Call this function when a new forum reply is added
    async function addForumReply(forumId, replyMessage) {
        const user = getAuth().currentUser;
        if (!user) return alert("Anda harus login untuk membalas!");
    
        try {
            await addDoc(collection(db, "forum_replies"), {
                forumId,
                userId: user.uid,
                replyMessage,
                timestamp: new Date(),
            });
    
            // Fetch forum title (optional, but improves notification clarity)
            const forumDoc = await getDoc(doc(db, "forums", forumId));
            if (forumDoc.exists()) {
                const forumData = forumDoc.data();
                addForumReplyNotification(forumData.userId, forumData.title);
            }
        } catch (error) {
            console.error("Error adding forum reply:", error);
        }
    }
    
    async function addChatReplyNotification(receiverId, senderName) {
        const db = getFirestore();
        try {
            await addDoc(collection(db, "notifications"), {
                userId: receiverId,
                title: "Pesan Baru di Chat",
                message: `Anda menerima pesan baru dari ${senderName}.`,
                timestamp: new Date(),
                read: false,
            });
            console.log("Chat reply notification added!");
        } catch (error) {
            console.error("Error adding chat reply notification:", error);
        }
    }    

    function loadNotifications(userId) {
        const notificationDropdown = document.getElementById("notificationDropdown");
        const notificationList = notificationDropdown.nextElementSibling; // Dropdown menu
        const badge = notificationDropdown.querySelector(".badge"); // Red badge
    
        if (!notificationList || !badge) return;
    
        const q = query(
            collection(db, "notifications"),
            where("userId", "==", userId),
            orderBy("timestamp", "desc")
        );
    
        onSnapshot(q, (snapshot) => {
            notificationList.innerHTML = "<li class='dropdown-header'>Notifikasi</li>"; // Reset list
            let unreadCount = 0;
    
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (!data.read) unreadCount++;
    
                const li = document.createElement("li");
                li.innerHTML = `<a class="dropdown-item" href="#" data-id="${doc.id}">${data.title} - ${data.message}</a>`;
                li.addEventListener("click", async () => {
                    await updateDoc(doc.ref, { read: true }); // Mark as read in Firestore
                });
                notificationList.appendChild(li);
            });
    
            // Update the badge number
            badge.textContent = unreadCount > 0 ? unreadCount : "";
            badge.style.display = unreadCount > 0 ? "inline-block" : "none";
        });
    }      
    
    // Function to display modal for registration
    if (registerButton) {
        registerButton.addEventListener("click", function () {
            // Check if the button text is "Daftar"
            if (registerButton.textContent === "Daftar") {
                registerModal.show();
            } 
        });
    }
    
    // Function to confirm registration
    if (confirmRegisterButton) {
        confirmRegisterButton.addEventListener("click", async function () {
            // Here you would typically call Firebase or any other backend service to update the user's registration status
            registerButton.textContent = "Terdaftar";  // Change the button text to "Terdaftar"
            alert("Anda sudah terdaftar!");
            registerModal.hide();
        });
    }

    confirmRegisterButton.addEventListener("click", registerForWorkshop);

    // Function to remind the user about the workshop on the event day
    async function remindWorkshop(userId, workshopDate) {
        const today = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
        if (today === workshopDate) {
            await addNotification(userId, "Workshop Dimulai Hari Ini", "Jangan lupa untuk mengikuti workshop hari ini!");
        }
    }

    // Function to handle button change to "Gabung" when workshop time arrives
    function checkWorkshopStatus() {
        const user = auth.currentUser;
        if (!registerButton) {
            console.error("registerButton not found!");
            return;
        }
        if (!user) return;

        getDoc(doc(db, "users", user.uid)).then((userDoc) => {
            if (userDoc.exists() && userDoc.data().workshopRegistered) {
                registerButton.textContent = "Terdaftar";
                registerButton.onclick = () => {
                    alert("Anda sudah terdaftar");
                    if (registerModal) registerModal.hide();
                };
            }
        });
    }

    async function registerForWorkshop() {
        const user = auth.currentUser;
        if (!user) return alert("Anda harus login terlebih dahulu!");

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
            const userData = userSnap.data();
            console.log("User data:", userData);
        }


        try {
            await updateDoc(userRef, {
                workshopRegistered: true,
                workshopDate: workshopDate
            });
            registerButton.textContent = "Terdaftar";
            registerButton.onclick = () => {
                alert("Anda sudah terdaftar");
                if (registerModal) registerModal.hide();
            };
            sendNotification("Workshop Terdaftar", "Anda sudah terdaftar untuk workshop virtual!");
            if (registerModal) registerModal.hide();
        } catch (error) {
            alert("Gagal mendaftar workshop: " + error.message);
            if (registerModal) registerModal.hide();
        }
    }

    async function sendNotification(title, message) {
        const user = auth.currentUser;
        if (!user) return;

        try {
            await addDoc(collection(db, "notifications"), {
                userId: user.uid,
                title,
                message,
                timestamp: new Date(),
                read: false,
            });
        } catch (error) {
            console.error("Error adding notification:", error);
        }
    }

    let editingEventId = null; // Store event ID if editing

    // 🔹 Function to open modal for Add or Edit
    function openEventModal(title = "", date = "", description = "", imageSrc = "", eventId = null) {
        eventTitleInput.value = title;
        eventDateInput.value = date;
        eventDescInput.value = description;
        eventImagePreview.src = imageSrc || "img/default.png"; // Default image
        eventImageInput.value = ""; // Reset file input
        selectedImageFile = null; // Reset stored image file
        editingEventId = eventId;

        saveEventBtn.textContent = eventId ? "Update Event" : "Simpan"; 
        eventModal.show();
    }

    // 🔹 "Tambah Event" button - Open modal to add new event
    document.getElementById("addEventBtn").addEventListener("click", function () {
        openEventModal(); // Empty fields for new event
    });

    // 🔹 "Edit" button - Open modal with existing event data
    document.querySelectorAll(".edit").forEach((editBtn) => {
        editBtn.addEventListener("click", function () {
            const eventCard = editBtn.closest(".thumbnail");
            const title = eventCard.querySelector("strong").textContent;
            const date = "2025-11-27"; // Fetch from Firestore if needed
            const description = "Deskripsi lama..."; // Fetch from Firestore if needed
            const imageSrc = eventCard.querySelector("img").src; 
            const eventId = editBtn.dataset.id; // Assume event ID is stored in `data-id`

            openEventModal(title, date, description, imageSrc, eventId);
        });
    });

    // 🔹 Handle form submission (Add or Update)
    eventImageInput.addEventListener("change", function (event) {
        const file = event.target.files[0];
        if (!file) return;

        selectedImageFile = file; // Store selected file

        const reader = new FileReader();
        reader.onload = function (e) {
            eventImagePreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    // 🔹 Handle form submission (Add or Update)
    saveEventBtn.addEventListener("click", async function () {
        const title = eventTitleInput.value.trim();
        const date = eventDateInput.value;
        const description = eventDescInput.value.trim();

        if (!title || !date || !description) {
            alert("Harap isi semua kolom!");
            return;
        }

        if (selectedImageFile) {
            // Upload the image to Firestore Storage
            const imageUrl = await uploadImage(selectedImageFile);
            if (editingEventId) {
                await updateEvent(editingEventId, title, date, description, imageUrl);
            } else {
                await addNewEvent(title, date, description, imageUrl);
            }
        } else {
            if (editingEventId) {
                await updateEvent(editingEventId, title, date, description, eventImagePreview.src);
            } else {
                await addNewEvent(title, date, description, eventImagePreview.src);
            }
        }

        eventModal.hide(); // Close modal
    });

    async function uploadImage(file) {
        const storageRef = firebase.storage().ref();
        const imageRef = storageRef.child(`events/${file.name}`);
        await imageRef.put(file);
        return await imageRef.getDownloadURL();
    }

    async function addNewEvent(title, date, description, imageSrc) {
        try {
            await addDoc(collection(db, "events"), {
                title,
                date,
                description,
                image: imageSrc,
                createdAt: new Date(),
            });
            alert("Event berhasil ditambahkan!");
        } catch (error) {
            console.error("Error adding event:", error);
            alert("Gagal menambahkan event!");
        }
    }

    // 🔹 Function to update an existing event
    async function updateEvent(eventId, title, date, description, imageSrc) {
        try {
            await updateDoc(doc(db, "events", eventId), {
                title,
                date,
                description,
                image: imageSrc,
            });
            alert("Event berhasil diperbarui!");
        } catch (error) {
            console.error("Error updating event:", error);
            alert("Gagal memperbarui event!");
        }
    }
    
    // Function to delete event from Firestore
    async function deleteEvent(eventId) {
        try {
            await deleteDoc(doc(db, "events", eventId));
            alert("Event berhasil dihapus!");
            loadEvents();
        } catch (error) {
            console.error("Error deleting event:", error);
        }
    }

    function loadEvents() {
        const eventContainer = document.getElementById("eventList");
    
        // ✅ Fix: Ensure eventList exists
        if (!eventContainer) {
            console.error("Error: #eventList not found in the document.");
            return;
        }
    
        eventContainer.innerHTML = "Memuat event...";
    
        const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            eventContainer.innerHTML = ""; // Clear previous events
            snapshot.forEach((doc) => {
                const data = doc.data();
                eventContainer.innerHTML += `
                    <div class='event-item'>
                        <h5>${data.title}</h5>
                        <p>${data.date}</p>
                        <p>${data.description}</p>
                        <button class='btn btn-danger' onclick='deleteEvent("${doc.id}")'>Hapus</button>
                    </div>
                `;
            });
        });
    }

        // Function to check if user is an admin and show Manage button
    function checkAdminStatus(user) {
        const userRef = doc(db, "users", user.uid);
        getDoc(userRef).then((docSnap) => {
            if (docSnap.exists() && docSnap.data().role === "admin") {
                document.querySelectorAll(".manageWorkshopBtn").forEach((btn) => {
                    btn.style.display = "block";
                });
            }
        }).catch((error) => {
            console.error("Error checking admin status:", error);
        });
    }
    
        // ✅ Update Firestore when clicking the notification dropdown
    document.getElementById("notificationDropdown").addEventListener("click", async () => {
        const user = getAuth().currentUser;
        if (!user) return;
    
        const q = query(
            collection(db, "notifications"),
            where("userId", "==", user.uid),
            where("read", "==", false)
        );
    
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (doc) => {
            await updateDoc(doc.ref, { read: true });
        });
    
        document.querySelector("#notificationDropdown .badge").style.display = "none";
    });  

    document.getElementById("addEventBtn").addEventListener("click", () => {
        const title = document.getElementById("eventTitle").value;
        const date = document.getElementById("eventDate").value;
        const description = document.getElementById("eventDesc").value;
    
        if (title && date && description) {
            addEvent(title, date, description);
            workshopModal.hide(); // Close modal after adding event
        } else {
            alert("Harap isi semua kolom!");
        }
    });

    document.querySelectorAll("#pagination .page-link").forEach((item) => {
        item.addEventListener("click", (event) => {
            event.preventDefault();
            document.querySelectorAll("#pagination .page-item").forEach((p) => p.classList.remove("active"));
            event.target.parentElement.classList.add("active");
        });
    });

    // Modify the sendMessage function to trigger a notification
    window.sendMessage = async function () {
        if (!currentExpert) {
            alert("Pilih expert terlebih dahulu!");
            return;
        }
        
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
            alert("Anda harus login untuk mengirim pesan!");
            return;
        }
    
        const messageInput = document.getElementById("chatMessageInput");
        const message = messageInput.value.trim();
        if (!message) return;
    
        try {
            const db = getFirestore();
            await addDoc(collection(db, "chats"), {
                expertId: currentExpert,
                userId: user.uid,
                senderName: user.displayName || "Pengguna",
                message,
                timestamp: new Date(),
            });
    
            // 🔹 Add notification for expert
            await addDoc(collection(db, "notifications"), {
                userId: currentExpert,
                title: "Pesan Baru",
                message: `Anda mendapat pesan baru dari ${user.displayName}`,
                timestamp: new Date(),
                read: false,
            });
    
            messageInput.value = ""; // Clear input
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Gagal mengirim pesan!");
        }
    };    
    
    // Function for joining the workshop (go to Zoom or Google Meet link)
    window.joinWorkshop = function (link) {
        window.location.href = link;
    };

    // 🔹 Load user data
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            document.getElementById("signedInNav").style.display = "flex";
            document.getElementById("signedOutNav").style.display = "none";

            const usernameDisplay = document.getElementById("usernameDisplay");
            const profilePic = document.getElementById("profilePic");
            const userLocation = document.getElementById("userLocation");
            const userAge = document.getElementById("userAge");

            checkWorkshopStatus();
            setInterval(checkWorkshopStatus, 60 * 1000);
            
            // Get additional user info from Firestore
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();

                usernameDisplay.textContent = userData.username || "Profile";
                userLocation.textContent = `${userData.location || "Unknown"}`;
                
                // Ensure correct age display
                userAge.textContent = `Age: ${parseInt(userData.age) || "Unknown"}`;

                // Ensure the element exists before setting the value
                if (document.getElementById("newUsName")) {
                    document.getElementById("newUsName").value = userData.username || "";
                }
                if (document.getElementById("newProvinsi")) {
                    document.getElementById("newProvinsi").value = userData.location || "";
                }
                if (document.getElementById("newDob")) {
                    document.getElementById("newDob").value = userData.dob || "";
                }

                if (userSnap.exists()) {
                    const userData = userSnap.data();
    
                    // If user is an admin, show all manage buttons
                    if (userData.role === "admin") {
                        document.querySelectorAll(".manageWorkshopBtn").forEach((btn) => {
                            btn.style.display = "block";
                        });
                    }
                }

                if (profilePic && userData.profilePicture) {
                    profilePic.src = userData.profilePicture;
                    profilePic.style.display = "block";
                    if (profileIcon) profileIcon.style.display = "none";
                } else {
                    if (profilePic) profilePic.style.display = "none";
                    if (profileIcon) profileIcon.style.display = "block";
                }
            }

            loadUserData(user);
            loadNotifications(user.uid);
            loadForums();
            checkAdminStatus(user);
            loadEvents();
        } else {
            document.getElementById("signedInNav").style.display = "none";
            document.getElementById("signedOutNav").style.display = "flex";
        }
    });
});
