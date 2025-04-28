import { db, auth } from "/Pataanguna/firebaseConf.js";
import { collection, addDoc, query, orderBy, onSnapshot, getDocs, limit, startAfter, doc, getDoc, where, updateDoc, serverTimestamp, increment } 
    from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

let lastVisible = null; // Add this global variable

// Function to add a forum post
export async function addForum(title, description) {
    const user = auth.currentUser;
    if (!user) {
        alert("Anda harus login terlebih dahulu!");
        return false;
    }

    try {
        // Get user profile data
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        await addDoc(collection(db, "forums"), {
            title,
            description,
            userId: user.uid,
            username: userData.username || user.email.split(' @')[0],
            userProfilePic: userData.profilePicture || "https://bootdey.com/img/Content/avatar/avatar1.png",
            timestamp: new Date(),
            replyCount: 0
        });
        alert("Topik diskusi berhasil ditambahkan!");
        return true;
    } catch (error) {
        alert("Gagal menambahkan topik diskusi: " + error.message);
        return false;
    }
}

// Function to load forum posts
export function loadForums(callback) {
    const q = query(collection(db, "forums"), orderBy("timestamp", "desc"));
    return onSnapshot(q, async (snapshot) => {
        const forums = [];
        const userIds = new Set();
        
        // Kumpulkan semua userId terlebih dahulu
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.userId) userIds.add(data.userId);
        });

        // Ambil data user sekaligus
        let userData = {};
        if (userIds.size > 0) {
            try {
                userData = await getUserData(Array.from(userIds));
            } catch (error) {
                console.error("Error loading user data:", error);
            }
        }

        // Proses setiap forum
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const user = data.userId ? userData[data.userId] : null;
            const repliesQuery = query(
                collection(db, "forum_replies"),
                where("forumId", "==", doc.id)
            );
            const repliesSnapshot = await getDocs(repliesQuery);
            
            forums.push({ 
                id: doc.id, 
                ...data,
                userProfilePic: user?.profilePic || data.userProfilePic || "https://bootdey.com/img/Content/avatar/avatar1.png",
                username: user?.username || data.username,
                replyCount: repliesSnapshot.size
            });
        }
        
        if (callback) callback(forums);
    });
}

// Load more forums when clicking "Next Page"
export async function loadMoreForums() {
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
}

export async function addForumReply(forumId, replyMessage) {
    const user = auth.currentUser;
    if (!user) return alert("Anda harus login untuk membalas!");

    try {
        // Get user profile data
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        // Add the reply
        await addDoc(collection(db, "forum_replies"), {
            forumId,
            userId: user.uid,
            username: userData.username || user.email.split('@')[0],
            userProfilePic: userData.profilePicture || "https://bootdey.com/img/Content/avatar/avatar1.png",
            replyMessage,
            timestamp: serverTimestamp(),
        });

        // Update reply count - use increment operation
        const forumRef = doc(db, "forums", forumId);
        await updateDoc(forumRef, {
            replyCount: increment(1)
        });

        // Send notification to forum creator if it's not the same user
        if (forumData.userId !== user.uid) {
            await addNotification(
                forumData.userId,
                "Balasan Baru di Forum",
                `Diskusi "${forumData.title}" telah mendapat balasan baru.`
            );
        }

        return true;
    } catch (error) {
        console.error("Error adding forum reply:", error);
        alert("Gagal menambahkan balasan: " + error.message);
        return false;
    }
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

// In forumFunctions.js - ensure the loadForumReplies function is properly exporting
export function loadForumReplies(forumId, callback) {
    const q = query(
        collection(db, "forum_replies"),
        where("forumId", "==", forumId),
        orderBy("timestamp", "asc")
    );
    
    return onSnapshot(q, (snapshot) => {
        const replies = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            replies.push({ 
                id: doc.id, 
                ...data,
                timestamp: data.timestamp?.toDate() || new Date() // Ensure timestamp is a Date object
            });
        });
        if (callback) callback(replies);
    }, (error) => {
        console.error("Error loading forum replies:", error);
        if (callback) callback([]);
    });
}

export async function getUserData(userId) {
    if (!userId || userId.length === 0) return {};
    
    const userData = {};
    const uniqueIds = [...new Set(Array.isArray(userId) ? userId : [userId].filter(id => id))]; // Handle both array and single ID
    const defaultImage = "https://bootdey.com/img/Content/avatar/avatar1.png";

    try {
        const userDocs = await Promise.all(
            uniqueIds.map(async id => { // Changed variable name to avoid shadowing
                const userRef = doc(db, "users", id);
                const userSnap = await getDoc(userRef);
                return { id, data: userSnap.exists() ? userSnap.data() : null };
            })
        );
        
        userDocs.forEach(({ id, data }) => {
            userData[id] = {
                username: data?.username || 'Anonymous',
                profilePic: data?.profilePicture || defaultImage
            };
        });
        
        return userData;

    } catch (error) {
         console.error("Error fetching user data:", error);
        // Return fallback data for all requested IDs
        uniqueIds.forEach(id => {
            if (!userData[id]) {
                userData[id] = {
                    username: 'Anonymous',
                    profilePic: defaultImage
                };
            }
        });
        return userData;
    }
}

export function loadForumsWithSort(callback, sortBy = 'timestamp') {
    let q;
    if (sortBy === 'timestamp') {
        q = query(collection(db, "forums"), orderBy("timestamp", "desc"));
    } else if (sortBy === 'popular') {
        q = query(collection(db, "forums"), orderBy("replyCount", "desc"));
    }

    return onSnapshot(q, async (snapshot) => {
        const forums = await processForumSnapshot(snapshot);
        if (callback) callback(forums);
    });
}

// Function to search forums
export function searchForums(searchTerm, callback) {
    const q = query(collection(db, "forums"), orderBy("title"));
    
    return onSnapshot(q, async (snapshot) => {
        const forums = await processForumSnapshot(snapshot);
        const filteredForums = forums.filter(forum => 
            forum.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            forum.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (callback) callback(filteredForums);
    });
}

// Helper function to process forum snapshot
async function processForumSnapshot(snapshot) {
    const forums = [];
    const userIds = new Set();
    
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.userId) userIds.add(data.userId);
    });

    const userData = await getUserData(Array.from(userIds));

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const user = data.userId ? userData[data.userId] : null;
        const repliesQuery = query(
            collection(db, "forum_replies"),
            where("forumId", "==", doc.id)
        );
        const repliesSnapshot = await getDocs(repliesQuery);
        
        forums.push({ 
            id: doc.id, 
            ...data,
            userProfilePic: user?.profilePic || data.userProfilePic || "https://bootdey.com/img/Content/avatar/avatar1.png",
            username: user?.username || data.username,
            replyCount: repliesSnapshot.size
        });
    }
    
    return forums;
}