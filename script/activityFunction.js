import { db, auth } from "/firebaseConf.js";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// 🔹 Enhanced save activity function with auth state guarantee
export const saveActivityProgress = async (activityType, activityName) => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe(); // Cleanup listener immediately
      
      if (!user) {
        console.error("User not authenticated - saveActivityProgress");
        reject(new Error("User not authenticated"));
        return;
      }

      try {
        const activityRef = collection(db, "users", user.uid, "activities");
        await addDoc(activityRef, {
          type: activityType,
          name: activityName,
          timestamp: new Date(),
          completed: true
        });
        resolve(true);
      } catch (error) {
        console.error("Failed to save activity:", error);
        reject(error);
      }
    }, (error) => {
      unsubscribe();
      reject(error);
    });
  });
};

// 🔹 Robust activity loading with auth state management
export const loadUserActivities = (callback) => {
  let unsubscribeAuth = null;
  let unsubscribeSnapshot = null;

  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (!user) {
      console.warn("User not authenticated - loadUserActivities");
      callback([]);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "activities"),
      orderBy("timestamp", "desc")
    );

    unsubscribeSnapshot = onSnapshot(q, 
      (snapshot) => {
        const activities = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(activities);
      },
      (error) => {
        console.error("Activity snapshot error:", error);
        callback([]);
      }
    );
  }, (error) => {
    console.error("Auth state error:", error);
    callback([]);
  });

  // Return cleanup function
  return () => {
    if (unsubscribeAuth) unsubscribeAuth();
    if (unsubscribeSnapshot) unsubscribeSnapshot();
  };
};

// 🔹 Calculate progress with safe defaults
export const calculateProgress = (activities = [], menuCategory = []) => {
  const totalMaterials = menuCategory.filter(item => item.kategori === 'literasi').length;
  const readMaterials = activities.filter(a => a.type === 'reading').length;
  const completedQuizzes = activities.filter(a => a.type === 'quiz').length;
  
  return {
    materials: {
      completed: readMaterials,
      total: totalMaterials,
      percentage: totalMaterials > 0 ? Math.round((readMaterials / totalMaterials) * 100) : 0
    },
    quizzes: {
      completed: completedQuizzes,
      total: 2, // Assuming 2 quizzes total
      percentage: Math.round((completedQuizzes / 2) * 100) || 0
    }
  };
};