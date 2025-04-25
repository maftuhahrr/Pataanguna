import chatFunction from "./script/chatFunction.js";
import { addForum, loadForums,  addForumReply, loadForumReplies, getUserData} from "./script/forumFunctions.js";
import { checkUserRole, registerUser  } from "./script/authFunctions.js";
import { openAdminModal, resetEventForm, handleEventImageChange, saveEvent, loadEvents, deleteEvent  } 
    from "./script/eventFunctions.js";
import { saveActivityProgress, loadUserActivities, calculateProgress } from "./script/activityFunction.js";
import { auth, db } from "/Pataanguna/firebaseConf.js";
import { collection, addDoc, onSnapshot, query, orderBy, setDoc, updateDoc, deleteDoc, where, doc, serverTimestamp, writeBatch, limit} 
    from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { initDailyQuoteFeature, sendDailyQuoteToAllUsers, checkUpcomingWorkshopsAndNotify } from "./script/notificationFunctions.js";


document.addEventListener("DOMContentLoaded", function () {
    const regis = document.getElementById("submitReg");
    if (regis) {
        regis.addEventListener("click", async function (event) {
            event.preventDefault();

            const email = document.getElementById("mail").value.trim();
            const password = document.getElementById("pwd").value.trim();
            const confirmPassword = document.querySelector("input[name='confirm-password']").value.trim();
            const username = document.getElementById("usName").value.trim();
            const fullName = document.getElementById("FName").value.trim();
            const location = document.getElementById("provinsi").value;
            const dob = document.getElementById("dob").value;

            registerUser(email, password, confirmPassword, username, location, dob, fullName);
        });
    }
});

const modalEl = document.getElementById('workshopRegistrationModal');
const apps = Vue.createApp({
    mixins: [chatFunction],
    
    data() {
          return {
              activeSection: 'home', // Default section
              currentTitle: null, // Initialize currentTitle
              videoVisible: true, // Initially video is visible
              showAbout: false,
              showContact: false,
              isAdmin:false,

            showExpertModal: false, // ✅ Controls modal visibility
            experts: [], // ✅ Stores expert list
            newExpert: { id:"", name: "", specialization: "", experience: "", image: "" },
            editExpert: null,
            isEditing: false,
            currentUser: null, // Add this to store current user info
            activeExpert: null, // Add this to store the expert being chatted with
            isExpert: false,

            eventTitle: "",
            eventDate: "",
            eventDescription: "",
            eventImagePreview: "",

            newForumTitle: '',
            newForumDescription: '',
            forums: [],
            forumReplies: {}, 
            showReplies: {}, 
            replyMessages: {}, 
            userProfiles: {}, 
            unsubscribeForums: null,
            unsubscribeReplies: {},

            showModal: false,
            currentCerita: {},
            userActivities: [],
            showActivityHistory: false,
            unsubscribeActivities: null,

            workshops: [],
            unsubscribeEvents: null,
            registrationModal: null,
            showRegistrationModal: false,
            selectedWorkshop: null,
            editingEventId: null,

            notifications: [],
            unreadCount: 0,
            unsubscribeNotifications: null,
            expandedNotificationId: null,

              sections: [
              {
                    title: "Literasi Kesehatan",
                    text: "Literasi Kesehatan ini merupakan langkah strategis untuk menciptakan remaja yang sehat secara fisik, emosional, dan sosial dengan fokus utama yaitu edukasi tentang pencegahan perilaku seksual berisiko, yang dikombinasikan dengan nilai-nilai Sara Pataanguna.",
                    img: "img/literasi kesehatan.png",
                },
                {
                    title: "Tes Pemahaman",
                    text: "Tes pemahaman ini dilakukan untuk menilai tingkat pengetahuan dan sikap remaja dalam melakukan pencegahan perilaku seksual berisiko dengan pendekatan filsafah Sara Pataanguna dari budaya Buton.",
                    img: "img/tes pemahaman.png",
                },
                {
                    title: "Konsultasi",
                    text: "Konsultasi ini merupakan layanan komunikasi antara remaja dan pemberi literasi kesehatan untuk membantu memahami diri sendiri, meningkatkan pengetahuan, dan membuat keputusan yang tepat.",
                    img: "img/konsultasi.png",
                },
                {
                    title: "Komunitas",
                    text: "Komunitas remaja bijak merupakan pemberdayaan remaja untuk mencegah perilaku seksual berisiko dengan kegiatan diskusi dan sharing pengalaman.",
                    img: "img/komunitas remaja bijak.png",
                }
              ],

              menuCategory: [
                {
                    title: "Mengenal Filsafat Sara Pataanguna",
                    text: "Pengantar tentang Sara Pataanguna (pengendalian diri), dan hubungan filosofi ini dengan kehidupan sehari-hari remaja",
                    img: "img/filsafah.PNG",
                    kategori:"literasi",
                },
                {
                    title: "Risiko Perilaku Seksual Pada Remaja",
                    text: "Memaparkan dampak kesehatan akibat perilaku seksual pada remaja yang menyebabkan kehamilan yang tidak diinginkan dan penyakit menular, serta menimbulkan stigma sosial dan konflik dalam keluarga",
                    img: "img/resiko.PNG",
                    kategori: "literasi"
                },
                {
                    title: "Pengendalian Diri Sesuai Filsafat Sara Pataanguna",
                    text: "Langkah-langkah efektif untuk pengembangan diri meliputi mengenali diri lebih dalam (introspeksi), meningkatkan pemahaman akan situasi dan diri sendiri (kesadaran), dan mengambil pilihan yang matang dan terukur (keputusan bijak)",
                    img: "img/pengendalian.PNG",
                    kategori:"literasi"
                },
                {
                    title: "Panduan Praktis Hidup Sehat",
                    text: "Memahami cara menjaga kesehatan reproduksi adalah langkah penting untuk kesejahteraan diri. Selain itu, mengembangkan strategi efektif untuk membina relasi yang harmonis dengan teman dan keluarga akan memperkaya kualitas hidup secara keseluruhan",
                    img: "img/panduan.PNG",
                    kategori:"literasi"
                },
                {
                    title: "Kuis Edukatif",
                    text: "Soal pilihan ganda dengan tema kesehatan reproduksi dan Sara Pataanguna.",
                    img: "img/tes pemahaman.png",
                    kategori:"tes",
                },
                {
                    title: "Evaluasi Diri",
                    text: "Tes untuk membantu memahami potensi risiko kesehatan yang mungkin timbul dari kebiasaan dan pilihan gaya hidup mereka sehari-hari..",
                    img: "img/q.png",
                    kategori: "tes"
                },
                {
                    title: "Konsultasi Pribadi",
                    text: "Chat dengan ahli kesehatan (dokter, psikolog) secara anonim",
                    img: "img/konsultasi.png",
                    kategori:"konsul"
                },
                {
                    title: "Forum Diskusi",
                    text: "Tempat berbagi pengalaman dan berdiskusi tentang literasi kesehatan dengan remaja lain.",
                    img: "img/speech-marks-2.jpg",
                    kategori:"konsul"
                },
                {
                    title: "Kegiatan Virtual",
                    text: "Webinar atau workshop tentang kesehatan remaja.",
                    img: "img/v.png",
                    kategori:"komun"
                },
                {
                    title: "Inspirasi Cerita Sukses",
                    text: "Kisah inspiratif remaja yang berhasil menerapkan nilai Sara Pataanguna",
                    img: "img/komunitas remaja bijak.png",
                    kategori:"komun"
                }
              ],
              filteredList: [], 

              menuItems: {
                filsafat: { 
                    title: 'Filsafat Sara Pataanguna',
                    altNm: 'Mengenal Filsafat Sara Pataanguna',  
                    video: 'vid/pengantar filsafah sara pataanguna.mp4',
                
                    subTitle1: 'Pengantar tentang Sara Pataanguna',
                    description1: 'Sara Pataanguna adalah konsep filosofis tradisional dari masyarakat Buton',
                    image1: 'img/filsafat_intro.png',
                
                    subTitle2: 'Hubungan Filosofi dengan Remaja',
                    description2: 'Bagaimana filosofi kuno seperti Sara Pataanguna dapat relevan dengan kehidupan remaja saat ini',
                    image2: 'img/filsafat_life.png'
                },

                risiko: { 
                    title: 'Risiko Perilaku Seksual', 
                    altNm: 'Risiko Perilaku Seksual Pada Remaja',
                    video: 'vid/pengantar resiko perilaku seksual.mp4',

                    subTitle1: 'Dampak kesehatan: kehamilan tak diinginkan, penyakit menular seksual.',
                    description1: 'dampak kesehatan akibat perilaku seksual pada remaja yang menyebabkan kehamilan yang tidak diinginkan dan penyakit menular seksual',
                    image1: 'img/filsafat_intro.png',
                
                    subTitle2: 'Dampak sosial: stigma, konflik keluarga.',
                    description2: 'Selain risiko kesehatan, perilaku seksual berisiko pada remaja juga dapat menimbulkan stigma sosial dan konflik dalam keluarga',
                    image2: 'img/filsafat_life.png'
 
                },

                pengendalian: { 
                    title: 'Pengendalian Diri', 
                    video: 'vid/pengantar pengendalian diri.mp4',

                    subTitle1: 'Teknik praktis: introspeksi diri, membangun kesadaran, dan membuat keputusan bijak.',
                    description1: 'Langkah-langkah efektif untuk pengembangan diri meliputi mengenali diri lebih dalam (introspeksi), meningkatkan pemahaman akan situasi dan diri sendiri (kesadaran), dan mengambil pilihan yang matang dan terukur (keputusan bijak)',
                    image1: 'img/filsafat_intro.png',
            
                },

                panduan: { 
                    title: 'Panduan Hidup Sehat', 
                    video: 'vid/pengantar panduan praktis hidup sehat.mp4',

                    subTitle1: 'Informasi tentang menjaga kesehatan reproduksi.',
                    description1: 'Menyajikan informasi penting dan praktis mengenai cara menjaga kesehatan sistem reproduksi.',
                    image1: 'img/filsafat_intro.png',
                
                    subTitle2: 'Strategi membangun hubungan positif dengan teman dan keluarga.',
                    description2: 'Mempelajari berbagai strategi efektif untuk meningkatkan komunikasi, mengatasi konflik, membangun kepercayaan, dan mempererat ikatan dengan teman dan keluarga',
                    image2: 'img/filsafat_life.png'
                }
              },

              currentVideo: "vid/opening, di awal aplikasi.mp4",
              currentTitle: "",
              sectionsData: [],

              questions: [
                  {
                      text: "Apa yang dimaksud dengan kesehatan reproduksi?",
                      options: [
                          { text: "Kesehatan tubuh secara umum", correct: false },
                          { text: "Kesehatan sistem reproduksi", correct: true, explanation: "Kesehatan reproduksi mencakup kesehatan sistem reproduksi manusia serta kesejahteraan fisik, mental, dan sosial terkait." },
                          { text: "Olahraga rutin", correct: false }
                      ]
                  },
                  {
                      text: "Bagaimana cara menjaga kesehatan reproduksi?",
                      options: [
                          { text: "Menghindari pola hidup sehat", correct: false },
                          { text: "Menjaga kebersihan dan pola makan sehat", correct: true, explanation: "Menjaga kebersihan dan pola makan yang sehat membantu menjaga kesehatan reproduksi." },
                          { text: "Mengabaikan gejala penyakit", correct: false }
                      ]
                  }
              ],

              shuffledQuestions: [],
              userAnswers: [],
              submitted: false,
              quizFinished: false,

              daftarPertanyaan: [
                {
                    teks: 'Seberapa sering kamu makan makanan cepat saji dalam seminggu?',
                    tipe: 'radio',
                    opsi: [
                        { teks: 'Jarang', nilai: 1 },
                        { teks: '1-2 kali', nilai: 2 },
                        { teks: '3-4 kali', nilai: 3 },
                        { teks: 'Lebih dari 4 kali', nilai: 4 },
                    ],
                },
                {
                    teks: 'Berapa jam kamu tidur dalam sehari?',
                    tipe: 'number',
                },
                {
                    teks: 'Aktivitas fisik apa yang kamu lakukan dalam seminggu?',
                    tipe: 'checkbox',
                    opsi: [
                        { teks: 'Olahraga teratur', nilai: 1 },
                        { teks: 'Aktivitas ringan (berjalan kaki, dll.)', nilai: 2 },
                        { teks: 'Tidak ada aktivitas fisik', nilai: 3 },
                    ],
                },
                {
                    teks: 'Seberapa sering kamu menggunakan gadget sebelum tidur?',
                    tipe: 'radio',
                    opsi: [
                        { teks: 'Tidak pernah', nilai: 1 },
                        { teks: 'Kadang-kadang', nilai: 2 },
                        { teks: 'Sering', nilai: 3 },
                        { teks: 'Hampir selalu', nilai: 4 },
                    ],
                },
            ],

            jawaban: {},
            hasilEvaluasi: null,
            submitted: false,

        storyTypes: {
            article: {
              buttonText: 'Baca'
            },
            video: {
              buttonText: 'Nonton'
            }
        },
        openStoryModal(story) {
            this.currentCerita = story;
            this.showModal = true;
            document.body.style.overflow = 'hidden';
            console.log("openStoryModal: showModal =", this.showModal);  // Add this line
        },
        
       closeStoryModal: () => {
    this.showModal = false;
    document.body.style.overflow = '';
},
  
  initStories() {
    // This is already defined in your data, but you can modify here if needed
    this.stories = [
      {
        id: 1,
        title: "Kisah Sukses Remaja Buton",
        description: "Bagaimana nilai budaya membantu pengambilan keputusan",
        img: "img/in.png",
        type: "article",
        content: {
          text: "Artikel lengkap akan muncul di sini...\n\nParagraf kedua dari konten artikel."
        }
      },
      {
        id: 2,
        title: "Video Inspirasi Sara Pataanguna",
        description: "Dokumentasi penerapan nilai budaya",
        img: "img/w.png",
        type: "video",
        content: {
          url: "https://www.youtube.com/embed/BDy2ChJusqU"
        }
      }
    ];
  },

          
    };

    },  
    mounted() {
        // 1. Inisialisasi auth dan dapatkan user pertama kali
        this.initAuth().then(async () => {
            console.log('Auth initialized, user:', this.currentUser?.uid);
            
            // Wait for role check to complete
            await checkUserRole(this);
            
            console.log("Post-check roles:", {
                isAdmin: this.isAdmin,
                isExpert: this.isExpert
            });
    
            // Rest of your initialization...
            if (this.isExpert) {
                await this.initChat();
                await this.loadMyChats();
            }

            if (this.currentUser) {
                initDailyQuoteFeature();  // ✅ panggil hanya jika user sudah login
                checkUpcomingWorkshopsAndNotify(this.currentUser.uid);
            }

        }).then(() => {
            console.log('User role checked, isExpert:', this.isExpert);
            
            // 3. Load data yang diperlukan berdasarkan role
            const loadPromises = [
                this.loadExperts(),
                this.setupForumListeners(),
                this.loadUserActivities(),
                this.setupEventListeners()
            ];
            
            // Jika user adalah expert, load chat list
            if (this.isExpert) {
                loadPromises.push(this.initChat());
            }
            
            return Promise.all(loadPromises);
        }).then(() => {
            console.log('All initial data loaded');
            
            // 4. Inisialisasi komponen lain yang tidak kritis
            this.initStories();
            this.shuffleQuestions();
            this.resetKalkulator();
            this.loadNotifications();
            //initModals();
            
            // 5. Jika expert, setup chat listeners
            if (this.isExpert) {
                this.loadMyChats().then(() => {
                    console.log('Expert chats loaded', this.myChats);
                });
            }
            
            // 6. Setup modal
            this.registrationModal = new bootstrap.Modal(
                document.getElementById('workshopRegistrationModal')
            );
            
        }).catch(error => {
            console.error('Initialization error:', error);
        });
    },

      beforeUnmount() {
        if (this.unsubscribeForums) {
            this.unsubscribeForums(); // Clean up the listener
        }
        if (this.unsubscribeActivities) {
            this.unsubscribeActivities();
        }
        if (this.unsubscribeEvents) {
            this.unsubscribeEvents(); // Clean up when component unmounts
        }
        if (this.unsubscribeExperts) {
            this.unsubscribeExperts();
        }
        if (this.unsubscribeNotifications) {
            this.unsubscribeNotifications();
        }
        const passwordForm = document.getElementById("securityForm");
        if (passwordForm) {
            passwordForm.replaceWith(passwordForm.cloneNode(true));
        }
        const deleteButton = document.querySelector(".btn-danger");
        if (deleteButton) {
            deleteButton.replaceWith(deleteButton.cloneNode(true));
        }
        const profileForm = document.getElementById("profileForm");
        if (profileForm) {
            profileForm.replaceWith(profileForm.cloneNode(true));
        }
        const uploadInput = document.getElementById("profilePicUpload");
        if (uploadInput) {
            uploadInput.replaceWith(uploadInput.cloneNode(true));
        }
        // Clean up all reply listeners
        Object.values(this.unsubscribeReplies).forEach(unsub => {
            if (unsub) unsub();
        });
    },

      computed: {
        category() {
            if (this.totalScore >= 12) return "Sehat & Seimbang ✅";
            if (this.totalScore >= 8) return "Perlu Perbaikan ⚠️";
            return "Berisiko ⚠️⚠️";
        }
    },

      methods: {
          shuffleQuestions() {
              this.shuffledQuestions = this.questions.map(q => [...q.options].sort(() => Math.random() - 0.5));
              this.userAnswers = new Array(this.questions.length).fill(null);
          },
          submitQuiz() {
              if (this.userAnswers.includes(null)) {
                  alert("Jawab semua pertanyaan terlebih dahulu!");
                  return;
              }
              this.submitted = true;
              this.saveActivityProgress("quiz", "Kuis Edukatif");
          },
          exitQuiz() {
              this.quizFinished = true;
              window.location.href = "/Pataanguna/index.html";
          },
          feedbackClass(qIndex) {
              return this.userAnswers[qIndex].correct ? "alert-success" : "alert-danger";
          },
          correctAnswer(qIndex) {
              return this.questions[qIndex].options.find(opt => opt.correct);
          },
          restartQuiz() {
              this.quizFinished = false;
              this.submitted = false;
              this.shuffleQuestions();
          },

          hitungRisiko() {
            let skorRisiko = 0;

            this.daftarPertanyaan.forEach((pertanyaan, index) => {
                if (pertanyaan.tipe === 'radio' || pertanyaan.tipe === 'number') {
                    skorRisiko += this.jawaban[index] || 0;
                } else if (pertanyaan.tipe === 'checkbox') {
                    skorRisiko += this.jawaban[index].reduce((sum, nilai) => sum + nilai, 0);
                }
            });

            if (skorRisiko < 7) {
                this.hasilEvaluasi = 'Gaya hidupmu sehat! ✅';
            } else if (skorRisiko < 14) {
                this.hasilEvaluasi = 'Gaya hidupmu perlu diperbaiki. ⚠️';
            } else {
                this.hasilEvaluasi = 'Gaya hidupmu berisiko tinggi! ❌';
            }

            this.submitted = true;
        },
        
        resetKalkulator() {
            this.daftarPertanyaan.forEach((pertanyaan, index) => {
                this.jawaban[index] = pertanyaan.tipe === 'checkbox' ? [] : null;
            });
            this.hasilEvaluasi = null;
            this.submitted = false;
        },
        
        switchSection(section) {
        this.activeSection = section;
        if (section === 'quiz') {
                this.hideVideo();
                this.currentTitle = "Quiz Title";
            } else if (section === 'evaluasi') {
                this.hideVideo();
                this.currentTitle = "Evaluasi Diri";
            } else if (section === 'home'){
                this.videoVisible = true;
            } else if (section === 'workshop'){
                this.hideVideo();
                this.currentTitle = "Kegiatan Virtual";
            }
            else if (section === 'cerita'){
                this.hideVideo();
                this.currentTitle = "Inspirasi Cerita Sukses";
            }
            else if (section === 'konsultasi'){
                this.hideVideo();
                this.currentTitle = "Konsultasi Pribadi";
            }
            else if (section === 'forum'){
                this.hideVideo();
                this.currentTitle = "Forum Diskusi";
            }
        },

        hideVideo() {
        this.videoVisible = false;
        },

        handleClickAndChange(key) {
            this.handleClick(key);
            this.changeContent(key);
        },

        handleClick(key) {
            if (this.menuItems[key]?.video) {
            this.currentVideo = this.menuItems[key].video; // Update video source
            this.currentTitle = this.menuItems[key].title;
            } else {
                console.error("Video not found for key:", key);
            }
          },
          
        changeContent(key) {
            if (this.menuItems[key]) {
            this.sections = [
                {
                    title: this.menuItems[key].subTitle1,
                    text: this.menuItems[key].description1,
                    img: this.menuItems[key].image1
                }
            ];

            if (this.menuItems[key].subTitle2) {
                this.sections.push({
                    title: this.menuItems[key].subTitle2,
                    text: this.menuItems[key].description2,
                    img: this.menuItems[key].image2
                });
            }

            this.isSubmenuActive = true;
        } else {
            this.sections = [...this.defaultSections];
            this.isSubmenuActive = false;
        }
        },

    viewSection(section) {
        this.hideVideo();
        this.activeSection = 'kategori';
        this.currentTitle = section.title;
        this.saveActivityProgress("reading", section.title);
        
        console.log("Selected Section:", section.title); // Debug
    
        if (typeof this.saveActivityProgress === "function") {
            this.saveActivityProgress("reading", section.title);
        } else {
            console.warn("saveActivityProgress is not defined.");
        }
    
        if (section.title === 'Literasi Kesehatan') {
            this.filteredList = this.menuCategory.filter(item => item.kategori === 'literasi');
        } else if (section.title === 'Tes Pemahaman') {
            this.filteredList = this.menuCategory.filter(item => item.kategori === 'tes');
        } else if (section.title === 'Konsultasi') {
            this.filteredList = this.menuCategory.filter(item => item.kategori === 'konsul');
        } else if (section.title === 'Komunitas') {
            this.filteredList = this.menuCategory.filter(item => item.kategori === 'komun');
        }
    
        console.log("Filtered List:", this.filteredList); // Debug
    },

    viewCategory(item) {
        this.saveActivityProgress("reading", item.title);
    console.log("User selected:", item);
    // Find the key in menuItems where altNm matches item.title
    const matchingKey = Object.keys(this.menuItems).find(key => this.menuItems[key].altNm === item.title);

    if (matchingKey) {
        this.handleClickAndChange(matchingKey);
        this.activeSection = "home";
        this.videoVisible = true;
    } else if (item.title === "Kuis Edukatif") {
        this.activeSection = "quiz";
    } else if (item.title === "Evaluasi Diri") {
        this.activeSection = "evaluasi";
    } else if (item.title === "Kegiatan Virtual") {
        this.activeSection = "workshop";
    } else if (item.title === "Inspirasi Cerita Sukses") {
        this.activeSection = "cerita";
    } else if (item.title === "Konsultasi Pribadi") {
        this.activeSection = "konsul";
    } else if (item.title === "Forum Diskusi") {
        this.activeSection = "forum";
    } else {
        console.warn("No matching alternative name found in menuItems for:", item.title);
    }
    },

    toggleSection(section) {
        if (section === 'about') {
            this.showAbout = true;
            this.showContact = false;
            this.$nextTick(() => {
                document.getElementById('aboutus').scrollIntoView({ behavior: 'smooth' });
            });
        } else if (section === 'contact') {
            this.showContact = true;
            this.showAbout = false;
            this.$nextTick(() => {
                document.getElementById('contactus').scrollIntoView({ behavior: 'smooth' });
            });
        }
    },
    
    openAddExpertModal() {
        this.isEditing = false;
        this.newExpert = { name: "", specialization: "", experience: "", image: "" };
        this.showExpertModal = true;
        this.$nextTick(() => {
            const modal = document.getElementById("addExpertModal");
            if (modal) {
                modal.classList.add("show");
                modal.style.display = "block";
                document.body.classList.add("modal-open");
            }
        });
    },
    
    closeAddExpertModal() {
        this.showExpertModal = false;
        this.newExpert = { name: "", specialization: "", experience: "", image: "" }; // Reset form
        this.$nextTick(() => {
            const modal = document.getElementById("addExpertModal");
            if (modal) {
                modal.classList.remove("show");
                modal.style.display = "none";
                document.body.classList.remove("modal-open");
            }
        });
        this.isEditing = false;
        this.newExpert = { name: "", specialization: "", experience: "", image: "" }; // Reset form
        this.editExpert = null;
    },
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.newExpert.image = e.target.result; // ✅ Store as Base64
        };
        reader.readAsDataURL(file);
    },

    // ✅ Add expert to Firestore
    async addExpert() {
        if (!this.newExpert.name || !this.newExpert.specialization || !this.newExpert.image || !this.newExpert.experience) {
            alert("Semua bidang harus diisi!");
            return;
        }

        try {
            const expertRef = collection(db, "experts");
        
            if (this.isEditing && this.editExpert?.id) {
              // Update existing expert
              await updateDoc(doc(expertRef, this.editExpert.id), {
                name: this.newExpert.name,
                specialization: this.newExpert.specialization,
                experience: this.newExpert.experience,
                image: this.newExpert.image,
              });
              alert("Konsultan berhasil diperbarui!");
            } else {
              // Add new expert
              const docRef = await addDoc(expertRef, {
                name: this.newExpert.name,
                specialization: this.newExpert.specialization,
                experience: this.newExpert.experience,
                image: this.newExpert.image,
              });
              alert("Konsultan berhasil ditambahkan!");
            }
        
            this.closeAddExpertModal();
            this.loadExperts(); // Refresh the expert list
          } catch (error) {
            console.error("Gagal menyimpan expert:", error.message);
          }
    },

    openEditExpertModal(expert) {
        this.isEditing = true;
        this.editExpert = expert; // Store the expert being edited
        this.newExpert = { ...expert }; // Clone data to edit
        this.showExpertModal = true;
    },

    async saveExpert() {
        try {
          // Validate required fields
          if (!this.newExpert.name || !this.newExpert.specialization || !this.newExpert.image || !this.newExpert.experience) {
            alert("Semua bidang harus diisi!");
            return;
          }
      
          const expertRef = collection(db, "experts");
      
          if (this.isEditing && this.editExpert?.id) {
            // Update existing expert
            await updateDoc(doc(expertRef, this.editExpert.id), {
              name: this.newExpert.name,
              specialization: this.newExpert.specialization,
              experience: this.newExpert.experience,
              image: this.newExpert.image,
            });
            alert("Expert berhasil diperbarui!");
          } else {
            // Add new expert - automatically includes the ID
            const docRef = await addDoc(expertRef, {
              id: "", // Placeholder that will be replaced
              name: this.newExpert.name,
              specialization: this.newExpert.specialization,
              experience: this.newExpert.experience || 0,
              image: this.newExpert.image
            });
            
            // Update the document to include its own ID
            await updateDoc(docRef, {
              id: docRef.id
            });
            
            alert("Expert berhasil ditambahkan!");
          }
      
          this.closeAddExpertModal();
          this.loadExperts(); // Refresh the list
        } catch (error) {
          console.error("Gagal menyimpan expert:", error);
          alert(`Gagal menyimpan expert: ${error.message}`);
        }
    },

    async deleteExpert(expert) {
        if (!expert?.id) {
          console.error("Invalid expert object:", expert);
          alert("Expert data tidak valid");
          return;
        }
      
        if (!confirm(`Apakah Anda yakin mau menghapus ${expert.name}?`)) {
          return;
        }
      
        try {
          // Verify db connection
          if (!db) {
            throw new Error("Firestore not initialized");
          }
      
          console.log("Attempting to delete expert with ID:", expert.id);
          
          await deleteDoc(doc(db, "experts", expert.id));
          console.log("Expert deleted successfully");
          
          // Refresh the experts list
          this.loadExperts();
          alert("Expert berhasil dihapus!");
          
        } catch (error) {
          console.error("Error deleting expert:", {
            error: error,
            expertId: expert.id,
            stack: error.stack
          });
          alert(`Gagal menghapus expert: ${error.message}`);
        }
      },

    // ✅ Load experts from Firestore in real-time
    async loadExperts() {
        try {
          const q = query(collection(db, "experts"));
          this.unsubscribeExperts = onSnapshot(q, (snapshot) => {
            this.experts = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            console.log("Experts loaded:", this.experts); // Debug log
          });
        } catch (error) {
          console.error("Error loading experts:", error);
          alert("Failed to load experts");
        }
    },

    openWorkshopModal() {
        if (!this.isAdmin) {
            alert("Anda tidak memiliki izin untuk menambahkan event.");
            return;
        }
        const modal = new bootstrap.Modal(document.getElementById("workshopModal"));
        modal.show();
    },
    
    async confirmWorkshopRegistration() {
        try {
            await addDoc(collection(db, "registrations"), {
                workshopId: this.selectedWorkshop.id,
                userId: this.currentUser.uid,
                registeredAt: new Date(),
                status: "pending"
            });
            
            this.registrationModal.hide();
            alert("Anda telah terdaftar untuk workshop ini!");
        } catch (error) {
            console.error("Registration error:", error);
            alert("Gagal mendaftar: " + error.message);
        }
    },

    async removeWorkshop(eventId) {
        deleteEvent(eventId, this.isAdmin);
    },

    openAdminModal() {
        if (!this.isAdmin) {
            alert("Anda tidak memiliki izin untuk menambahkan event.");
            return;
        }
        
        this.$nextTick(() => {
            const modalEl = document.getElementById('workshopManageModal');
            if (!modalEl) {
                console.error('Modal element not found');
                return;
            }
            
            // Check if Bootstrap is available
            if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
                console.error('Bootstrap not loaded');
                return;
            }
            
            try {
                const modal = new bootstrap.Modal(modalEl, {
                    backdrop: true,
                    keyboard: true,
                    focus: true
                });
                modal.show();
                
                modalEl.addEventListener('hidden.bs.modal', () => {
                    document.body.style.overflow = 'auto';
                });
            } catch (error) {
                console.error('Error initializing modal:', error);
            }
        });
    },

      handleEventImageChange(event) {
        const file = event.target.files[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = (e) => {
          this.eventImagePreview = e.target.result;
        };
        reader.readAsDataURL(file);
      },
      
      async saveEvent() {
        if (!this.eventTitle || !this.eventDate || !this.eventDescription) {
          alert("Harap isi semua kolom!");
          return;
        }
    
        try {
            const eventData = {
                title: this.eventTitle,
                date: this.eventDate,
                description: this.eventDescription,
                image: this.eventImagePreview || "img/default.png",
                updatedAt: new Date()
            };
    
            if (this.editingEventId) {
                // Update existing event
                await updateDoc(doc(db, "events", this.editingEventId), eventData);
                alert("Event updated successfully!");
            } else {
                // Create new event
                eventData.createdAt = new Date();
                await addDoc(collection(db, "events"), eventData);
                alert("Event created successfully!");
            }
    
            // Reset form and close modal
            this.resetEventForm();
            const modal = bootstrap.Modal.getInstance(document.getElementById("workshopManageModal"));
            modal.hide();
            
            // Clear editing ID
            this.editingEventId = null;
            
        } catch (error) {
            console.error("Error saving event:", error);
            alert("Error saving event: " + error.message);
        }
      },
      
      async deleteEvent(eventId) {
        if (!this.isAdmin) {
            alert("Anda tidak memiliki izin untuk menghapus event.");
            return;
        }
    
        if (!confirm("Apakah Anda yakin ingin menghapus event ini?")) return;
    
        const result = await deleteEvent(eventId);
        if (result.success) {
            alert("Event berhasil dihapus!");
            this.setupEventListeners();
        } else {
            alert(`Gagal menghapus event: ${result.error}`);
        }
    },
    
    saveEvent() {
        saveEvent(this);
    },

    setupForumListeners() {
        this.unsubscribeForums = loadForums((forums) => {
            this.forums = forums.map(forum => ({
                ...forum,
                replyCount: forum.replyCount || 0  // Ensure default value
            }));
            
            // Load user profiles
            const userIds = [...new Set(forums.map(f => f.userId).filter(Boolean))];
            if (userIds.length) {
                getUserData(userIds).then(profiles => {
                    this.userProfiles = { ...this.userProfiles, ...profiles };
                });
            }
        });
    },
    
    openWorkshopRegistrationModal(workshop) {
        this.selectedWorkshop = workshop;
        
        if (!this.registrationModal) {
            // Try to initialize if not already done
            const modalElement = document.getElementById('workshopRegistrationModal');
            if (modalElement) {
                this.registrationModal = new bootstrap.Modal(modalElement);
            } else {
                console.error('Modal element not found');
                return;
            }
        }
        
        this.registrationModal.show();
    },
    
    async confirmWorkshopRegistration() {
        try {
            await addDoc(collection(db, "registrations"), {
                workshopId: this.selectedWorkshop.id,
                userId: this.currentUser.uid,
                registeredAt: new Date(),
                status: "pending"
            });
    
            // Tandai sebagai terdaftar di daftar & modal
            const foundWorkshop = this.workshops.find(w => w.id === this.selectedWorkshop.id);
            if (foundWorkshop) {
                foundWorkshop.registered = true;
            }
            if (this.selectedWorkshop) {
                this.selectedWorkshop.registered = true;
            }
    
            alert("Anda telah terdaftar untuk workshop ini!");
            this.registrationModal.hide();
            this.showRegistrationModal = false;
        } catch (error) {
            console.error("Registration error:", error);
            alert("Gagal mendaftar: " + error.message);
        }
    },

    editWorkshop(workshop) {
        if (!this.isAdmin) {
          alert("Anda tidak memiliki izin untuk mengedit event.");
          return;
        }
        
        this.eventTitle = workshop.title;
        this.eventDate = workshop.date;
        this.eventDescription = workshop.description;
        this.eventImagePreview = workshop.image;
        this.editingEventId = workshop.id; // Store the ID for editing
        
        const modal = new bootstrap.Modal(
          document.getElementById('workshopManageModal')
        );
        modal.show();
      },

    async addForumTopic() {
        if (!this.newForumTitle || !this.newForumDescription) {
            alert('Judul dan deskripsi harus diisi!');
            return;
        }

        try {
            // Now using the imported addForum function
            const success = await addForum(this.newForumTitle, this.newForumDescription);
            if (success) {
                this.newForumTitle = '';
                this.newForumDescription = '';
            }
        } catch (error) {
            console.error('Error adding forum topic:', error);
            alert('Gagal menambahkan topik: ' + error.message);
        }
    },

    loadForums() {
        const forumContainer = document.getElementById("forumContainer");
        if (!forumContainer) return;

        const q = query(collection(db, "forums"), orderBy("timestamp", "desc"));
        onSnapshot(q, (snapshot) => {
            forumContainer.innerHTML = "";
            snapshot.forEach((doc) => {
                const data = doc.data();
                const forumDiv = document.createElement("div");
                forumDiv.classList.add("cardF", "mb-2");
                forumDiv.innerHTML = `
                    <div class="card-bodyF p-2 p-sm-3">
                        <div class="media forum-item">
                            <a href="#" data-toggle="collapse" data-target=".forum-content">
                                <img src="https://bootdey.com/img/Content/avatar/avatar1.png" 
                                     class="mr-3 rounded-circle" width="50" alt="User" />
                            </a>
                            <div class="media-body">
                                <h6>${data.title}</h6>
                                <p class="text-secondary">${data.description}</p>
                                <p class="text-muted">
                                    <small>Posted by ${data.userEmail || 'Anonymous'}</small>
                                    <small class="text-secondary font-weight-bold">
                                        ${new Date(data.timestamp?.toDate()).toLocaleString()}
                                    </small>
                                </p>
                            </div>
                        </div>
                    </div>
                `;
                forumContainer.appendChild(forumDiv);
            });
        });
    },

    async saveActivityProgress(activityType, activityName) {
        const success = await saveActivityProgress(activityType, activityName);
        if (!success) {
            alert("Gagal menyimpan aktivitas. Pastikan Anda sudah login.");
        }
        return success;
    },
    
    loadUserActivities() {
        this.unsubscribeActivities = loadUserActivities((activities) => {
            this.userActivities = activities;
        });
    },
    
    calculateProgress() {
        return calculateProgress(this.userActivities, this.menuCategory);
    },

    loadActivities() {
        // Clean up previous listener if exists
        if (this.unsubscribeActivities) {
          this.unsubscribeActivities();
        }
        
        this.unsubscribeActivities = loadUserActivities((activities) => {
          this.userActivities = activities;
          this.$forceUpdate(); // Ensure UI updates
        });
      },
      
      async trackActivity(type, name) {
        try {
          await saveActivityProgress(type, name);
          // Optional: refresh activities after saving
          this.loadActivities();
        } catch (error) {
          console.error("Activity tracking failed:", error);
          if (error.message.includes("not authenticated")) {
            this.$router.push('/login'); // Redirect if not authenticated
          }
        }
      },

      setupEventListeners() {
        // Clean up previous listener if exists
        if (this.unsubscribeEvents) {
            this.unsubscribeEvents();
        }
        
        // Set up new listener
        const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
        this.unsubscribeEvents = onSnapshot(q, (snapshot) => {
            this.workshops = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }, (error) => {
            console.error("Event listener error:", error);
        });
    },
    
      async loadUserWorkshops() {
        if (!this.currentUser) return;
        
        // Load events
        this.unsubscribeEvents = loadEvents(this.currentUser, (events) => {
            // Load user's registrations
            const registrationsQuery = query(
                collection(db, "registrations"),
                where("userId", "==", this.currentUser.uid)
            );
            
            onSnapshot(registrationsQuery, (snapshot) => {
                const registeredWorkshopIds = new Set();
                snapshot.forEach(doc => {
                    registeredWorkshopIds.add(doc.data().workshopId);
                });
                
                // Merge registration status with events
                this.workshops = events.map(event => ({
                    ...event,
                    registered: registeredWorkshopIds.has(event.id)
                }));
            });
        });
      },
    
      async addReply(forumId) {
        const replyMessage = (this.replyMessages[forumId] || '').trim();
        if (!replyMessage) {
            alert("Silakan tulis balasan terlebih dahulu!");
            return;
        }

        // Optimistic UI update
        const forumIndex = this.forums.findIndex(f => f.id === forumId);
        if (forumIndex >= 0) {
            this.forums[forumIndex].replyCount = (this.forums[forumIndex].replyCount || 0) + 1;
        }

        try {
            const success = await addForumReply(forumId, replyMessage);
            if (success) {
                this.replyMessages = {
                    ...this.replyMessages,
                    [forumId]: ''
                };
            } else {
                // Rollback if failed
                if (forumIndex >= 0) {
                    this.forums[forumIndex].replyCount = Math.max(0, (this.forums[forumIndex].replyCount || 1) - 1);
                }
            }
        } catch (error) {
            console.error("Error:", error);
            // Rollback optimistic update
            if (forumIndex >= 0) {
                this.forums[forumIndex].replyCount = Math.max(0, (this.forums[forumIndex].replyCount || 1) - 1);
            }
            alert("Gagal menambahkan balasan: " + error.message);
        }
    },

    async loadUserData(userIds) {
        // Filter out invalid IDs and already cached users
        const missingIds = userIds.filter(id => 
            id && typeof id === 'string' && id.length > 5 && !this.userDataCache[id]
        );
        
        if (missingIds.length === 0) return;
        
        try {
            const newUserData = await getUserData(missingIds);
            this.userDataCache = { 
                ...this.userDataCache, 
                ...newUserData 
            };
        } catch (error) {
            console.error("Error loading user data:", error);
            // Initialize fallback data for all requested IDs
            missingIds.forEach(id => {
                if (!this.userDataCache[id]) {
                    this.userDataCache[id] = {
                        username: id.slice(0, 6) + '...', // Show partial ID
                        profilePic: 'https://bootdey.com/img/Content/avatar/avatar1.png'
                    };
                }
            });
        }
    },
    
    getUserProfile(userId) {
        // Return cached data or fallback
        return this.userDataCache[userId] || {
            username: userId ? userId.slice(0, 6) + '...' : 'Anonymous',
            profilePic: 'https://bootdey.com/img/Content/avatar/avatar1.png'
        };
    },

    async fetchForums() {
        loadForums(async (forums) => {
          this.forums = forums;
  
          // Get unique userIds from forums
          const userIds = [...new Set(forums.map(forum => forum.userId))];
  
          // Fetch user data
          const users = await getUserData(userIds);
          this.userProfiles = users;
        });
      },
      handleImageError(event) {
        event.target.src = "https://bootdey.com/img/Content/avatar/avatar1.png";
      },

      async toggleForumReplies(forumId) {
        this.showReplies = {
            ...this.showReplies,
            [forumId]: !this.showReplies[forumId]
        };
        
        if (this.showReplies[forumId]) {
            await this.loadForumReplies(forumId);
        }
    },
    
    async loadForumReplies(forumId) {
        try {
          // Initialize replies array if it doesn't exist
          if (!this.forumReplies[forumId]) {
            this.forumReplies = {
              ...this.forumReplies,
              [forumId]: []
            };
          }
    
          // Clean up previous listener if exists
          if (this.unsubscribeReplies[forumId]) {
            this.unsubscribeReplies[forumId]();
          }
    
          // Set up new listener
          this.unsubscribeReplies[forumId] = loadForumReplies(forumId, (replies) => {
            this.forumReplies = {
              ...this.forumReplies,
              [forumId]: replies
            };
    
            // Load user profiles for replies
            const userIds = replies.map(reply => reply.userId).filter(id => id);
            if (userIds.length > 0) {
              getUserData(userIds).then(userData => {
                this.userProfiles = { ...this.userProfiles, ...userData };
              });
            }
          });
        } catch (error) {
          console.error("Error loading forum replies:", error);
        }
      },
    
      async openChat(expertId) {
        // Get the current user from Firebase auth
        const user = auth.currentUser;
        if (!user) {
            alert("Anda harus login terlebih dahulu untuk mengirim pesan");
            return;
        }
    
        // Find the expert by ID
        const expert = this.experts.find(e => e.id === expertId);
        if (!expert) {
            console.error("Expert not found:", expertId);
            return;
        }
    
        // Set up the active chat
        this.activeChat = {
            expertId: expert.id,
            expertName: expert.name,
            userId: user.uid,
            userName: user.displayName || "Anonymous"
        };
    
        this.chatOpen = true;
        this.loadMessages();
    },

    handleChatClick(expertId) {
        this.openChat(expertId);
    },

    async openExpertChat(expertId) {
        try {
            // 1. Cari expert yang dipilih
            const expert = this.experts.find(e => e.id === expertId);
            if (!expert) {
                throw new Error(`Expert dengan ID ${expertId} tidak ditemukan`);
            }
    
            // 2. Pastikan user sudah login
            if (!this.currentUser) {
                alert('Anda harus login terlebih dahulu');
                return;
            }
    
            // 3. Set data chat
            this.activeChat = {
                expertId: expert.id,
                expertName: expert.name,
                userId: this.currentUser.uid,
                userName: this.currentUser.displayName || "Pengguna"
            };
    
            // 4. Cari atau buat chat ID
            this.activeChat.id = await this.findOrCreateChatId();
            
            // 5. Buka chat dan load messages
            this.chatOpen = true;
            await this.loadMessages(this.activeChat.id);
            
        } catch (error) {
            console.error("Error opening expert chat:", error);
            alert(error.message || "Gagal memulai chat");
        }
    },

    showLoginAlert(){
    alert('Anda harus masuk dahulu')
    },

      async initAuth() {
        return new Promise((resolve) => {
            auth.onAuthStateChanged(user => {
                this.currentUser = user;
                resolve();
            });
        });
    },
    
    async startChat(expertId) {
        const userId = this.currentUser?.uid;
        if (!userId) return;
        
        const chatId = await this.createChat(userId, expertId);
        if (chatId) {
          this.activeChat = {
            id: chatId,
            expertId,
            userId
          };
          this.chatOpen = true;
        }
    },

    openChatWithUser(chat) {
        this.activeChat = chat;
        this.loadMessages(chat.id);
    },
    
    loadNotifications() {
        const user = auth.currentUser;
        if (!user) return;
        
        const q = query(
            collection(db, "notifications"),
            where("userId", "==", user.uid),
            orderBy("timestamp", "desc"),
            limit(10)
        );
        
        this.unsubscribeNotifications = onSnapshot(q, (snapshot) => {
            this.notifications = [];
            this.unreadCount = 0;
            
            snapshot.forEach(doc => {
                const data = doc.data();
                this.notifications.push({
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate() || new Date()
                });
                
                if (!data.read) {
                    this.unreadCount++;
                }
            });
        });
    },
    formatNotificationTime(timestamp) {
        if (!timestamp) return '';
        
        const now = new Date();
        const diffInSeconds = Math.floor((now - timestamp) / 1000);
        
        if (diffInSeconds < 60) return 'Baru saja';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
        
        return timestamp.toLocaleDateString();
    },
    
    async handleNotificationClick(notification) {
        // 🔄 Toggle ekspansi (biar teks bisa terbaca penuh)
        if (this.expandedNotificationId === notification.id) {
            this.expandedNotificationId = null; // collapse
        } else {
            this.expandedNotificationId = notification.id; // expand
        }
    
        // ✅ Tandai sebagai dibaca kalau belum
        if (!notification.read) {
            try {
                await updateDoc(doc(db, "notifications", notification.id), {
                    read: true
                }); 
                this.unreadCount--;
            } catch (error) {
                console.error("Error marking notification as read:", error);
            }
        }
    
        // ✅ Navigasi berdasarkan jenis notifikasi
        switch(notification.title) {
            case 'Balasan Pesan':
                this.switchSection('forum');
                break;
            case 'Kutipan Harian':
                break;
            case 'Event Baru':
                this.switchSection('workshop');
                break;
        }
    },
    
    async markAllAsRead() {
        try {
            const batch = writeBatch(db);
            const unreadNotifications = this.notifications.filter(n => !n.read);
            
            unreadNotifications.forEach(notification => {
                const notificationRef = doc(db, "notifications", notification.id);
                batch.update(notificationRef, { read: true });
            });
            
            await batch.commit();
            this.unreadCount = 0;
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
        }
    },
    
    // Hapus notifikasi
    async deleteNotification(notificationId) {
        if (confirm("Apakah Anda yakin ingin menghapus notifikasi ini?")) {
            try {
                await deleteDoc(doc(db, "notifications", notificationId));
            } catch (error) {
                console.error("Error deleting notification:", error);
            }
        }
    },
    
    // Lihat semua notifikasi
    viewAllNotifications() {
        // Arahkan ke halaman notifikasi lengkap jika ada
        console.log("View all notifications clicked");
    },

    },
    }
);

apps.mount("#apps");
window.vueApp = apps;


