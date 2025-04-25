import { db, auth } from "/Pataanguna/firebaseConf.js";
import { collection, addDoc, query, orderBy, onSnapshot, where, updateDoc, getDocs, doc, getDoc, deleteDoc } 
    from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-messaging.js";

let unsubscribeNotificationListener = null;

export async function addNotification(userId, title, message) {
    try {
        // Get user preferences first
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const preferences = userSnap.data().notificationPreferences || {
                messageReplies: true,
                profileChanges: true,
                reminders: true,
                events: true
            };
            
            // Check if this type of notification is enabled
            let notificationEnabled = true;
            if (title.includes("Balasan") || title.includes("Pesan")) {
                notificationEnabled = preferences.messageReplies;
            } else if (title.includes("Profile")) {
                notificationEnabled = preferences.profileChanges;
            } else if (title.includes("Pengingat")) {
                notificationEnabled = preferences.reminders;
            } else if (title.includes("Event") || title.includes("Workshop")) {
                notificationEnabled = preferences.events;
            }
            
            if (notificationEnabled) {
                await addDoc(collection(db, "notifications"), {
                    userId,
                    title,
                    message,
                    timestamp: new Date(),
                    read: false
                });
            }
        }
    } catch (error) {
        console.error("Error adding notification:", error);
    }
}

// Function to display notifications
export function loadNotifications(userId) {
    if (unsubscribeNotificationListener) {
        unsubscribeNotificationListener();
    }

    const notificationDropdown = document.getElementById("notificationDropdown");
    const notificationList = notificationDropdown.nextElementSibling;
    const badge = notificationDropdown.querySelector(".badge");

    if (!notificationList || !badge) return;

    const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        orderBy("timestamp", "desc")
    );

    unsubscribeNotificationListener = onSnapshot(q, (snapshot) => {
        notificationList.innerHTML = "<li class='dropdown-header'>Notifikasi</li>";
        let unreadCount = 0;

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.read) unreadCount++;

            const li = document.createElement("li");
            li.classList.add("notification-item");
            li.innerHTML = `
                <a class="dropdown-item notification-link" href="#" data-id="${docSnap.id}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">
                    <strong>${data.title}</strong><br>
                    <span class="notification-message" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${data.message}</span>
                </a>
            `;

            li.addEventListener("click", async (e) => {
                e.preventDefault();

                try {
                    const notifRef = doc(db, "notifications", docSnap.id);
                    await updateDoc(notifRef, { read: true });

                    const messageSpan = li.querySelector(".notification-message");

                    if (messageSpan) {
                        const isExpanded = messageSpan.dataset.expanded === "true";
                        if (isExpanded) {
                            messageSpan.style.whiteSpace = "nowrap";
                            messageSpan.style.overflow = "hidden";
                            messageSpan.style.textOverflow = "ellipsis";
                            messageSpan.dataset.expanded = "false";
                        } else {
                            messageSpan.style.whiteSpace = "normal";
                            messageSpan.style.overflow = "visible";
                            messageSpan.style.textOverflow = "unset";
                            messageSpan.dataset.expanded = "true";
                        }
                    }
                } catch (error) {
                    console.error("Gagal tandai notifikasi sebagai dibaca:", error);
                }
            });

            notificationList.appendChild(li);
        });

        badge.textContent = unreadCount > 0 ? unreadCount : "";
        badge.style.display = unreadCount > 0 ? "inline-block" : "none";
    });
}

export async function addChatReplyNotification(receiverId) {
    const db = getFirestore();
    try {
        await addDoc(collection(db, "notifications"), {
            userId: receiverId,
            title: "Pesan Baru di Chat",
            message: "Anda menerima pesan baru dari Pengguna Anonim",
            timestamp: new Date(),
            read: false,
        });
        console.log("Chat reply notification added!");
    } catch (error) {
        console.error("Error adding chat reply notification:", error);
    }
}

// Minta izin notifikasi saat halaman dimuat
function requestNotificationPermission() {
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            console.log("Notifikasi diizinkan!");
            getFCMToken();
        } else {
            console.log("Notifikasi ditolak.");
        }
    });
}

// Ambil token untuk menerima notifikasi dari Firebase Cloud Messaging
function getFCMToken() {
    const messaging = getMessaging();
    getToken(messaging, { 
        vapidKey: "BE4l2lu4evrmUdsnGgqbQU3IOz4IByh_E8oufn2f-IlKKfZc_8MOx5FWICw3FATzGF1EREN29bm8zrXViU5uocE" 
    }).then(token => {
        console.log("FCM Token:", token);
    }).catch(err => {
        console.log("Gagal mendapatkan token:", err);
    });
}

const quotes = [
    "Pengembangan diri adalah tugas yang lebih tinggi daripada pengorbanan diri.",
    "Lakukanlah yang kita bisa lakukan di masa kini dengan sebaik-baiknya, karena mungkin kesempatan tidak akan datang untuk yang kedua kalinya. Jangan sampai menyesal.",
    "Jika kamu tak membuat kesalahan, berarti kamu tak membuat keputusan.",
    "Pikiran yang tenang melahirkan keputusan yang bijak.",
    "Kesuksesan adalah jumlah dari usaha kecil yang diulang setiap hari.",
    "Jangan takut gagal, takutlah tidak mencoba.",
    "Setiap hari adalah kesempatan baru untuk tumbuh.",
    "Ketekunan hari ini adalah kesuksesan esok.",
];

// Fungsi untuk mendapatkan kutipan acak
function getRandomQuote() {
    return quotes[Math.floor(Math.random() * quotes.length)];
}

async function showDailyNotificationToDropdown() {
    const quote = getRandomQuote();

    const notificationDropdown = document.getElementById("notificationDropdown");
    const notificationList = notificationDropdown?.nextElementSibling;

    if (!notificationList) return;

    const dailyId = "daily-inspiration";
    if (document.getElementById(dailyId)) return;

    const li = document.createElement("li");
    li.id = dailyId;
    notificationList.insertBefore(li, notificationList.firstChild);

    // 🔽 Tambahan: Simpan kutipan ke Firestore untuk user saat ini
    const user = auth.currentUser;
    if (user) {
        await addNotification(user.uid, "Kutipan Harian", quote);
        await addNotification(user.uid, "Pengingat", "Yuk lanjutkan belajar hari ini di modul literasi!");
        await addNotification(user.uid, "Pengingat", "Sudahkah kamu mencoba kuis dan evaluasi diri hari ini?");
        console.log("Kutipan juga disimpan di Firestore.");
    } else {
        console.warn("User belum login, kutipan tidak disimpan.");
    }
}

// 🔹 Kirim kutipan harian ke semua user (dipakai admin)
export async function sendDailyQuoteToAllUsers() {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const quote = getRandomQuote();

    usersSnapshot.forEach(async (docSnap) => {
        const userId = docSnap.id;
        await addNotification(userId, "Kutipan Harian", quote);
    });

    console.log("Kutipan harian dikirim ke semua user.");
}

export function initDailyQuoteFeature() {
    const user = auth.currentUser;
    if (!user) return;

    const today = new Date().toLocaleDateString();
    const storageKey = `dailyQuoteShown_${user.uid}`;
    const lastShown = localStorage.getItem(storageKey);

    if (lastShown !== today) {
        showDailyNotificationToDropdown();
        localStorage.setItem(storageKey, today);
    }
}

// 🔹 Function to save notification preferences
export async function saveNotificationPreferences(preferences) {
    const user = auth.currentUser;
    if (!user) return false;

    try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            notificationPreferences: preferences,
            updatedAt: new Date()
        });
        return true;
    } catch (error) {
        console.error("Error saving notification preferences:", error);
        return false;
    }
}

// 🔹 Function to load notification preferences
export async function loadNotificationPreferences() {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            return userSnap.data().notificationPreferences || {
                messageReplies: true,
                profileChanges: true,
                reminders: true,
                events: true
            };
        }
        return null;
    } catch (error) {
        console.error("Error loading notification preferences:", error);
        return null;
    }
}

export async function checkUpcomingWorkshopsAndNotify(userId) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const snapshot = await getDocs(collection(db, "events"));
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.date) return;

        const eventDate = new Date(data.date);
        const eventDateStr = eventDate.toISOString().split('T')[0];

        const dayBefore = new Date(eventDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        const dayBeforeStr = dayBefore.toISOString().split('T')[0];

        if (todayStr === eventDateStr) {
            addNotification(userId, "Webinar Hari Ini", `Hari ini ada webinar: ${data.title}`);
        } else if (todayStr === dayBeforeStr) {
            addNotification(userId, "Pengingat Webinar", `Besok ada webinar: ${data.title}`);
        }
    });
}

// Initialize notifications when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    requestNotificationPermission();
    // setTimeout(showDailyNotificationToDropdown, 3000);
    // setInterval(showDailyNotificationToDropdown, 86400000);
});

