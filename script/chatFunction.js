import { auth, db } from "./firebaseConf.js";
import { collection, addDoc, query, where, orderBy, onSnapshot, 
    doc, getDoc, getDocs, updateDoc, or, and, limit, serverTimestamp 
  } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

export default {
    data() {
        return {
            chatOpen: false,
            activeChat: null,
            chatMessages: [],
            newMessage: "",
            myChats: [],
            isExpert: false,
            currentUser: null,
            unsubscribeChats: null,
            unsubscribeMessages: null,
            unsubscribeAuth: null,
            loadingMessages: false
        };
    },

    methods: {
        // In chatFunction.js, modify initChat():
        async initChat() {
            return new Promise((resolve) => {
                this.unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
                    this.currentUser = user;
                    if (user) {
                        const userDoc = await getDoc(doc(db, "users", user.uid));
                        if (userDoc.exists()) {
                            this.isExpert = userDoc.data().isExpert || false;
                            
                            if (this.isExpert) {
                                await this.loadMyChats(); // Load daftar chat untuk expert
                            }
                        }
                    }
                    resolve(true);
                });
            });
        },

        // Memuat daftar chat untuk expert
        async loadMyChats() {
            if (!this.isExpert || !this.currentUser) return;
            
            try {
                console.log("Current User UID:", this.currentUser.uid);
                
                // 1. Cari dokumen expert
                const expertQuery = query(
                    collection(db, "experts"),
                    where("userId", "==", this.currentUser.uid)
                );
                const expertSnapshot = await getDocs(expertQuery);
            
                if (expertSnapshot.empty) {
                    console.error("Expert profile not found for user:", this.currentUser.uid);
                    return;
                }
                
                const expertDoc = expertSnapshot.docs[0];
                const expertId = expertDoc.id;
                const expertData = expertDoc.data();
                console.log("Expert Data:", {id: expertId, ...expertData});
        
                // 2. Query chats - versi diperbaiki tanpa multiple '!=' filters
                const chatsQuery = query(
                    collection(db, "chats"),
                    or(
                        where("expertId", "==", expertId),
                        where("userId", "==", expertId)
                    ),
                    orderBy("updatedAt", "desc")
                );
                
                console.log("Chats Query Conditions:", chatsQuery);
                
                // 3. Setup real-time listener
                this.unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
                    if (snapshot.empty) {
                        console.log("No chats found with query:", chatsQuery);
                    } else {
                        console.log("Chats found:", snapshot.docs.length);
                    }
                    
                    // Filter hasil di sisi client untuk menghindari chat dengan diri sendiri
                    this.myChats = snapshot.docs
                        .map(doc => {
                            const data = doc.data();
                            return {
                                id: doc.id,
                                ...data,
                                formattedTime: data.updatedAt?.toDate?.().toLocaleTimeString() || ""
                            };
                        })
                        .filter(chat => 
                            (chat.expertId === expertId && chat.userId !== expertId) ||
                            (chat.userId === expertId && chat.expertId !== expertId)
                        );
                });
                
            } catch (error) {
                console.error("Error loading chats:", {
                    error: error.message,
                    stack: error.stack
                });
                this.myChats = [];
            }
        },
        
        async debugChatCollection() {
            try {
                const snapshot = await getDocs(collection(db, "chats"));
                console.log("All chats in collection:", {
                    size: snapshot.size,
                    docs: snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
                });
            } catch (error) {
                console.error("Debug failed:", error);
            }
        },
        
        formatTime(timestamp) {
            if (!timestamp?.toDate) return "";
            const date = timestamp.toDate();
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        },
        
        truncate(text, length) {
            if (!text) return "";
            return text.length > length ? text.substring(0, length) + "..." : text;
        },
        
        async markMessagesAsRead(chatId) {
            if (!chatId || !this.isExpert) return;
            
            try {
                // 1. Update unread count in chat document
                const chatRef = doc(db, "chats", chatId);
                await updateDoc(chatRef, {
                    unreadCount: 0
                });
                
                // 2. Mark all messages as read
                const messagesQuery = query(
                    collection(db, "chats", chatId, "messages"),
                    where("read", "==", false),
                    where("senderIsExpert", "==", false)
                );
                
                const snapshot = await getDocs(messagesQuery);
                const batch = writeBatch(db);
                
                snapshot.docs.forEach(doc => {
                    batch.update(doc.ref, { read: true });
                });
                
                await batch.commit();
            } catch (error) {
                console.error("Error marking messages as read:", error);
            }
        },

        async openChat(participant) {
            if (!this.currentUser) {
                alert("Silakan login terlebih dahulu");
                return false;
            }
        
            this.chatOpen = false; // Reset status sementara
            this.loadingMessages = true;
        
            try {
                // 1. Setup data dasar chat
                this.activeChat = {
                    expertId: this.isExpert ? null : participant.id || participant.expertId,
                    userId: this.isExpert ? participant.userId || participant.id : this.currentUser.uid,
                    expertName: this.isExpert ? null : participant.name || "Expert",
                    userName: this.isExpert ? participant.userName || "User" : this.currentUser.displayName || "User",
                    id: null // Pastikan direset dulu
                };
        
                // 2. Cari atau buat chat (dengan timeout)
                this.activeChat.id = await Promise.race([
                    this.findOrCreateChatId(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout mencari chat')), 5000)
                    )
                ]);
        
                // 3. Load messages hanya jika dapat ID
                if (this.activeChat.id) {
                    await this.loadMessages(this.activeChat.id);
                    this.chatOpen = true;
                } else {
                    throw new Error('Gagal mendapatkan ID chat');
                }
        
                return true;
        
            } catch (error) {
                console.error("Error in openChat:", {
                    error: error.message,
                    participant,
                    activeChat: this.activeChat
                });
                
                this.chatOpen = false;
                this.loadingMessages = false;
                alert("Gagal mempersiapkan sesi chat: " + error.message);
                return false;
            }
        },
        
        async findOrCreateChatId() {
            // 1. Cari chat yang sudah ada
            const existingId = await this.findExistingChatId();
            if (existingId) return existingId;
            
            // 2. Jika tidak ada, buat baru
            return this.createNewChat();
        },
        
        async findExistingChatId() {
            const q = query(
                collection(db, "chats"),
                or(
                    and(
                        where("userId", "==", this.activeChat.userId),
                        where("expertId", "==", this.activeChat.expertId)
                    ),
                    and(
                        where("userId", "==", this.activeChat.expertId),
                        where("expertId", "==", this.activeChat.userId)
                    )
                ),
                limit(1)
            );
            
            const snapshot = await getDocs(q);
            return snapshot.docs[0]?.id;
        },
        
        async createNewChat() {
            const chatRef = await addDoc(collection(db, "chats"), {
                userId: this.activeChat.userId,
                expertId: this.activeChat.expertId,
                userName: this.activeChat.userName,
                expertName: this.activeChat.expertName,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastMessage: "",
                lastMessageTime: null
            });
            return chatRef.id;
        },
        
        async loadMessages(chatId) {
            if (!chatId) {
                console.error("Chat ID is missing");
                return;
            }
            
            // Hapus listener sebelumnya jika ada
            if (this.unsubscribeMessages) {
                this.unsubscribeMessages();
            }
            this.loadingMessages = true;
            this.chatMessages = [];
        
            try {
                console.log(`Loading messages for chat: ${chatId}`);
                const messagesRef = collection(db, "chats", chatId, "messages");
                const q = query(messagesRef, orderBy("timestamp", "asc"));
                
                this.unsubscribeMessages = onSnapshot(q, (snapshot) => {
                    this.chatMessages = snapshot.docs.map(doc => {
                        console.log("Received messages:", snapshot.docs.map(doc => doc.data()));
                        const data = doc.data();
                        return {
                            id: doc.id,
                            text: data.text,
                            timestamp: data.timestamp,
                            isCurrentUser: data.senderId === this.currentUser?.uid,
                            senderName: data.senderName,
                            read: data.read || false
                        };
                    });
                    
                    this.loadingMessages = false;
                    this.$nextTick(() => this.scrollToBottom());
                    console.log("Chat messages updated:", this.chatMessages);
                });
            } catch (error) {
                console.error("Error loading messages:", error);
                this.loadingMessages = false;
                this.chatError = "Gagal memuat pesan";
            }
        },
        
        scrollToBottom() {
            const chatBox = document.querySelector('.chat-box');
            if (chatBox) {
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        },

        async sendMessage() {
            // Validasi menyeluruh
            if (!this.newMessage?.trim()) {
                alert("Pesan tidak boleh kosong");
                return;
            }
            
            if (!this.activeChat?.id) {
                const success = await this.ensureChatId();
                if (!success) return;
            }
            
            try {
                // 1. Pastikan chat document ada
                const chatRef = doc(db, "chats", this.activeChat.id);
                const chatSnap = await getDoc(chatRef);
                
                if (!chatSnap.exists()) {
                    throw new Error(`Chat document ${this.activeChat.id} tidak ditemukan`);
                }

                // 2. Kirim pesan
                const messagesRef = collection(db, "chats", this.activeChat.id, "messages");
                console.log("Adding message to:", messagesRef);
                await addDoc(messagesRef, {
                    text: this.newMessage.trim(),
                    senderId: this.currentUser.uid,
                    senderIsExpert: this.isExpert,
                    senderName: this.currentUser.displayName || "User",
                    timestamp: serverTimestamp(),
                    read: false,
                });

                // 3. Update chat terakhir
                await updateDoc(chatRef, {
                    updatedAt: serverTimestamp(),
                    lastMessage: this.newMessage.trim()
                });
                const receiverId = this.isExpert ? this.activeChat.userId : this.activeChat.expertId;
                await addNotification(
                    receiverId,
                    "Pesan Baru di Chat",
                    `Anda menerima pesan baru dari ${this.currentUser.displayName || "Pengguna"}`
                );

                this.newMessage = "";
                this.$nextTick(() => {
                    this.scrollToBottom();
                });
            } catch (error) {
                console.error("Send message error:", {
                    error: error.message,
                    chatId: this.activeChat?.id,
                    chatData: JSON.parse(JSON.stringify(this.activeChat))
                });
                alert("Gagal mengirim pesan: " + error.message);
            }
        },

        async ensureChatId() {
            try {
                if (!this.activeChat?.userId || !this.activeChat?.expertId) {
                    throw new Error('Data chat tidak lengkap');
                }
                
                this.activeChat.id = await this.findOrCreateChatId();
                return !!this.activeChat.id;
                
            } catch (error) {
                console.error("EnsureChatId failed:", error);
                alert("Gagal mempersiapkan chat: " + error.message);
                return false;
            }
        },
        
        // User mengirim pesan ke expert
        async sendMessageToExpert(expertId, message) {
            if (!this.currentUser || this.isExpert) return;

            try {
                await addDoc(collection(db, "chats"), {
                    userId: this.currentUser.uid,
                    expertId: expertId,
                    message: message,
                    senderId: this.currentUser.uid,
                    senderName: this.currentUser.displayName || "User",
                    receiverId: expertId,
                    receiverName: "Expert",
                    timestamp: serverTimestamp(),
                    read: false,
                    senderIsExpert: false
                });
                
            } catch (error) {
                console.error("Error sending message:", error);
            }
        },

        // Expert membuka chat dengan user
        async openChatWithUser(chat) {
            if (!this.isExpert) return;
            
            this.activeChat = {
                chatId: chat.id,
                userId: chat.userId,
                expertId: chat.expertId
            };
            
            // Memuat histori pesan
            const q = query(
                collection(db, "chats"),
                and(
                    or(
                        and(
                            where("userId", "==", chat.userId),
                            where("expertId", "==", chat.expertId)
                        ),
                        and(
                            where("userId", "==", chat.expertId),
                            where("expertId", "==", chat.userId)
                        )
                    )
                ),
                orderBy("timestamp", "asc")
            );
            
            this.unsubscribeMessages = onSnapshot(q, (snapshot) => {
                this.chatMessages = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        message: data.message,
                        timestamp: data.timestamp,
                        isCurrentUser: data.senderId === this.currentUser.uid,
                        senderName: data.senderName
                    };
                });
                
                // Tandai pesan sebagai terbaca
                snapshot.docs.forEach(async doc => {
                    if (!doc.data().read && doc.data().senderId !== this.currentUser.uid) {
                        await updateDoc(doc.ref, { read: true });
                    }
                });
            });
        },

        closeChat() {
            if (this.unsubscribeMessages) {
                this.unsubscribeMessages();
            }
            this.chatOpen = false;
            this.activeChat = null;
        },

        loadChatMessages(chatId, callback) {
            return onSnapshot(
              query(
                collection(db, "chats", chatId, "messages"),
                orderBy("timestamp", "asc")
              ),
              (snapshot) => {
                const messages = snapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                }));
                callback(messages);
              },
              (error) => {
                console.error("Error loading messages:", error);
              }
            );
        },

        loadUserChats(userId, isExpert = false, callback) {
            const field = isExpert ? "expertId" : "userId";
            
            return onSnapshot(
              query(
                collection(db, "chats"),
                where(field, "==", userId),
                orderBy("updatedAt", "desc")
              ),
              async (snapshot) => {
                const chats = await Promise.all(snapshot.docs.map(async doc => {
                  const data = doc.data();
                  const lastMsg = await this.getLastMessage(doc.id);
                  
                  return {
                    id: doc.id,
                    ...data,
                    lastMessage: lastMsg?.text || "",
                    lastMessageTime: lastMsg?.timestamp
                  };
                }));
                callback(chats);
              }
            );
        },

        async getLastMessage(chatId) {
            try {
              const snapshot = await getDocs(
                query(
                  collection(db, "chats", chatId, "messages"),
                  orderBy("timestamp", "desc"),
                  limit(1)
                )
              );
              return snapshot.docs[0]?.data();
            } catch (error) {
              console.error("Error getting last message:", error);
              return null;
            }
        },
        
    },

    beforeUnmount() {
        if (this.unsubscribeAuth) this.unsubscribeAuth();
        if (this.unsubscribeChats) this.unsubscribeChats();
        if (this.unsubscribeMessages) this.unsubscribeMessages();
    }
};