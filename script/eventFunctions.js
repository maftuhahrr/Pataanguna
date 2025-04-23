import { db } from "./firebaseConf.js";
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } 
  from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

let editingEventId = null; // Store event ID if editing
let selectedImageFile = null;

// Initialize modals
let eventModal = null;
let registrationModal = null;

export function initModals() {
  eventModal = new bootstrap.Modal(document.getElementById("workshopManageModal"));
  registrationModal = new bootstrap.Modal(document.getElementById("workshopRegistrationModal"));
}

// 🔹 Function to open modal for Add or Edit
export function openEventModal(title = "", date = "", description = "", imageSrc = "", eventId = null, isAdmin) {
    const eventTitleInput = document.getElementById("eventTitle");
    const eventDateInput = document.getElementById("eventDate");
    const eventDescInput = document.querySelector(".eventDesc");
    const eventImageInput = document.querySelector("#workshopManageModal input[type='file']");
    const eventImagePreview = document.querySelector("#workshopManageModal img");
    const saveEventBtn = document.getElementById("saveEventBtn");

    if (!isAdmin) return;
    eventTitleInput.value = title;
    eventDateInput.value = date;
    eventDescInput.value = description;
    eventImagePreview.src = imageSrc || "img/default.png"; // Default image
    eventImageInput.value = ""; // Reset file input
    selectedImageFile = null; // Reset stored image file
    editingEventId = eventId;

    saveEventBtn.textContent = eventId ? "Update Event" : "Simpan";

    const modal = new bootstrap.Modal(document.getElementById("workshopManageModal"));
    modal.show();
}

// 🔹 Handle form submission (Add or Update)
export function handleEventImageChange(event, appInstance) {
    const file = event.target.files[0];
    if (!file) return;

    selectedImageFile = file; // Store file for upload

    const reader = new FileReader();
    reader.onload = (e) => {
        appInstance.eventImagePreview = e.target.result; // Show preview
    };
    reader.readAsDataURL(file);
}

// 🔹 Handle form submission (Add or Update)
export async function saveEvent(appInstance) {
  if (!appInstance.eventTitle || !appInstance.eventDate || !appInstance.eventDescription) {
        alert("Harap isi semua kolom!");
        return;
    }
    try {
      const eventData = {
        title: appInstance.eventTitle,
        date: appInstance.eventDate,
        description: appInstance.eventDescription,
        image: appInstance.eventImagePreview || "img/default.png",
        updatedAt: new Date() // Always update this field
      };
  
      if (appInstance.editingEventId) {
        // Update existing event
        await updateDoc(doc(db, "events", appInstance.editingEventId), eventData);
        alert("Event berhasil diperbarui!");
      } else {
        // Create new event
        eventData.createdAt = new Date();
        await addDoc(collection(db, "events"), eventData);
        alert("Event berhasil ditambahkan!");
      }
  
      // Reset form
      resetEventForm(appInstance);
      
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById("workshopManageModal"));
      modal.hide();
      
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Gagal menyimpan event: " + error.message);
    }
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
export async function deleteEvent(eventId) {
    try {
        await deleteDoc(doc(db, "events", eventId));
        return { success: true };
    } catch (error) {
        console.error("Delete error:", error);
        return { success: false, error: error.message };
    }
}

export function loadEvents(userData, callback) {
  const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const events = [];
    snapshot.forEach((doc) => {
      events.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(events);
  });

  return unsubscribe; // Return the unsubscribe function
}

// 🔹 Open Admin Modal
export function openAdminModal(isAdmin, resetEventForm) {
    if (!isAdmin) {
        alert("Anda tidak memiliki izin untuk menambahkan event.");
        return;
    }

    resetEventForm(); // Clear form before opening
    const modal = new bootstrap.Modal(document.getElementById("workshopManageModal"));
    modal.show();
}

// 🔹 Reset Event Form
export function resetEventForm(appInstance) {
    appInstance.eventTitle = "";
    appInstance.eventDate = "";
    appInstance.eventDescription = "";
    appInstance.eventImagePreview = "";
    appInstance.editingEventId = null; // Clear editing ID
}

  // 🔹 Open registration modal
export function openRegistrationModal(workshop) {
  if (!registrationModal) {
      registrationModal = new bootstrap.Modal(document.getElementById("workshopRegistrationModal"));
  }
  // Set workshop data here if needed
  registrationModal.show();
}

export async function registerForWorkshop(workshopId, userId) {
  try {
      // Get workshop data first
      const workshopRef = doc(db, "events", workshopId);
      const workshopSnap = await getDoc(workshopRef);
      
      if (!workshopSnap.exists()) {
          return { success: false, error: "Workshop tidak ditemukan" };
      }
      
      const workshopData = workshopSnap.data();
      
      // Add registration
      await addDoc(collection(db, "registrations"), {
          workshopId,
          userId,
          registeredAt: serverTimestamp(),
          status: "confirmed"
      });

      // Send notification to user
      await addNotification(
          userId,
          "Pendaftaran Workshop Berhasil",
          `Anda telah terdaftar untuk workshop "${workshopData.title}" pada ${workshopData.date}`
      );

      return { success: true };
  } catch (error) {
      console.error("Registration error:", error);
      return { success: false, error: error.message };
  }
}