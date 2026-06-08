// MediConnect Mock Database & State Seed Data

const initialDatabase = {
  // Profiles
  users: {
    patient: {
      id: "patient_john",
      role: "patient",
      name: "John Doe",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
      bio: "Diagnosed with Type 2 Diabetes in 2024. Focused on healthy living, nutrition, and cardiovascular fitness.",
      healthStats: {
        bloodPressure: "122/80 mmHg",
        heartRate: "72 bpm",
        bloodSugar: "105 mg/dL",
        steps: 8430,
        hydration: 5 // cups of water
      },
      badges: [
        { id: "step_champion", name: "10k Walker", icon: "🏃‍♂️", desc: "Walked 10,000 steps in a day" },
        { id: "hydration_hero", name: "Hydration Hero", icon: "💧", desc: "Drank 8 cups of water in a day" },
        { id: "vaccine_star", name: "Immunized", icon: "🛡️", desc: "Received annual flu shot" }
      ],
      medicalHistory: [
        { date: "2024-03-12", condition: "Type 2 Diabetes mellitus", severity: "Moderate", status: "Managed" },
        { date: "2023-08-05", condition: "Mild Hypertension", severity: "Mild", status: "Controlled" },
        { date: "2021-11-19", condition: "Seasonal Allergies (Pollen)", severity: "Mild", status: "Seasonal" }
      ],
      prescriptions: [
        { id: "rx_01", medicine: "Metformin 500mg", dosage: "1 tablet, twice daily", duration: "Ongoing", refills: 2, doctor: "Dr. Sarah Lin", status: "Active" },
        { id: "rx_02", medicine: "Lisinopril 10mg", dosage: "1 tablet daily", duration: "Ongoing", refills: 1, doctor: "Dr. Sarah Lin", status: "Active" }
      ],
      labReports: [
        { id: "lab_01", test: "HbA1c Blood Test", date: "2026-05-15", result: "6.2% (Target: < 7.0%)", status: "Normal", doctor: "Dr. Sarah Lin" },
        { id: "lab_02", test: "Lipid Profile", date: "2026-04-10", result: "Cholesterol: 185 mg/dL, LDL: 98 mg/dL", status: "Normal", doctor: "Dr. Sarah Lin" }
      ],
      timeline: [
        { date: "2026-05-15", type: "lab", title: "HbA1c Results Uploaded", desc: "Your HbA1c level is down to 6.2%. Great progress on diet control!" },
        { date: "2026-05-10", type: "visit", title: "Follow-up Clinic Visit", desc: "Consulted Dr. Sarah Lin. Blood pressure is stable at 122/80. Prescriptions renewed." },
        { date: "2026-04-01", type: "recovery", title: "Achievement unlocked: Active Lifestyle", desc: "Completed 30 consecutive days of walking 8,000+ steps." }
      ]
    },
    doctor: {
      id: "doctor_sarah",
      role: "doctor",
      name: "Dr. Sarah Lin",
      avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=150&h=150&q=80",
      bio: "Chief of Endocrinology & General Cardiology Consultant. Researching lifestyle interventions in diabetic remission.",
      specialization: "Cardiology & Endocrinology",
      credentials: "MD, FACC, Harvard Medical School",
      availability: "Mon, Wed, Fri - 09:00 AM to 03:00 PM",
      achievements: [
        "Recipient of the 2025 Clinical Excellence Award",
        "Published 15+ articles in the American Heart Journal"
      ]
    },
    staff: {
      id: "staff_james",
      role: "staff",
      name: "Nurse James Miller",
      avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&h=150&q=80",
      bio: "Emergency Room Lead Nurse & Bed Coordinator. 8 years of critical care experience.",
      department: "Emergency & General Ward Management",
      shift: "Day Shift (07:00 AM - 07:00 PM)",
      emergencyContact: "+1 (555) 911-3049"
    }
  },

  // Directory of members for the sidebar list
  directory: [
    { id: "doctor_sarah", name: "Dr. Sarah Lin", role: "doctor", specialization: "Cardiology", avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=150&h=150&q=80", online: true },
    { id: "doctor_vance", name: "Dr. Marcus Vance", role: "doctor", specialization: "Pediatrics", avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=150&h=150&q=80", online: true },
    { id: "doctor_elena", name: "Dr. Elena Rostova", role: "doctor", specialization: "Neurology", avatar: "https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&w=150&h=150&q=80", online: false },
    { id: "staff_james", name: "Nurse James Miller", role: "staff", department: "Emergency Ward", avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&h=150&q=80", online: true },
    { id: "staff_clara", name: "Pharmacist Clara", role: "staff", department: "Pharmacy", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&h=150&q=80", online: true },
    { id: "patient_john", name: "John Doe (Patient)", role: "patient", condition: "Type 2 Diabetes", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80", online: true },
    { id: "patient_alice", name: "Alice Cooper", role: "patient", condition: "Recovery", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80", online: false }
  ],

  // News Feed Posts
  posts: [
    {
      id: "post_1",
      authorName: "Dr. Sarah Lin",
      authorRole: "doctor",
      authorAvatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=150&h=150&q=80",
      time: "2 hours ago",
      tag: "Awareness Campaign",
      content: "Understanding Insulin Resistance: Simple lifestyle shifts can reverse the prediabetic pathway. Focus on consuming whole fiber grains, walking 15 minutes after meals, and reducing refined sugar. Let's make wellness a habit! 🥗🏃‍♂️",
      image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80",
      likes: 24,
      likedByUser: false,
      comments: [
        { author: "John Doe", text: "Dr. Lin, these post-meal walks have drastically dropped my glucose levels! Thank you!" },
        { author: "Alice Cooper", text: "Great advice. Can you publish a list of low glycemic foods?" }
      ]
    },
    {
      id: "post_2",
      authorName: "MediConnect Admin",
      authorRole: "staff",
      authorAvatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&h=150&q=80",
      time: "5 hours ago",
      tag: "Hospital Announcement",
      content: "🏥 NEW TECHNOLOGY ARRIVAL: Our Cardiology Wing has completed installing the Siemens Somatom Cardio CT scanner. This cuts scanning times by 40% and provides high-definition imaging for advanced cardiac diagnosis. Booking for outpatient scanning opens tomorrow.",
      image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80",
      likes: 42,
      likedByUser: true,
      comments: [
        { author: "Dr. Marcus Vance", text: "This is a monumental upgrade for our diagnostic diagnostics. Exceptional work by procurement!" }
      ]
    },
    {
      id: "post_3",
      authorName: "John Doe",
      authorRole: "patient",
      authorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
      time: "1 day ago",
      tag: "Recovery Story",
      content: "Exactly 6 months ago, I was admitted here with a critical blood sugar count. Today, thanks to the continuous guidance of the MediConnect endocrinology staff and the group accountability, my HbA1c is down to 6.2%! Feeling stronger, active, and fully in control of my health journey. 💪✨",
      image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=800&q=80",
      likes: 56,
      likedByUser: false,
      comments: [
        { author: "Dr. Sarah Lin", text: "So incredibly proud of your discipline, John! You are a motivation to all of us." },
        { author: "Nurse James Miller", text: "Awesome recovery story, John! Keep inspiring others." }
      ]
    }
  ],

  // Support Groups
  groups: [
    {
      id: "grp_diabetes",
      name: "Diabetes Care & Support",
      members: 142,
      avatar: "🥗",
      description: "A secure circle for diabetic and pre-diabetic patients to discuss recipes, monitor tips, share progress, and support one another's fitness journeys.",
      messages: [
        { sender: "Alice Cooper", time: "10:15 AM", text: "Does anyone have a good sugar-free protein pancake recipe?" },
        { sender: "John Doe", time: "10:20 AM", text: "Hey Alice, I use oat flour, almond milk, stevia, and clean whey protein! Dr. Lin approved it last month." },
        { sender: "Dr. Sarah Lin", time: "11:00 AM", text: "That's an excellent recipe John. Make sure to watch the overall carbohydrate portions, though!" }
      ]
    },
    {
      id: "grp_cardio",
      name: "Cardiology Wellness Hub",
      members: 95,
      avatar: "❤️",
      description: "Dedicated to heart-healthy routines, hypertension management, post-cardiac surgery recovery tips, and cardiac rehab group discussions.",
      messages: [
        { sender: "Dr. Sarah Lin", time: "Yesterday", text: "Just a reminder: cardiovascular rehabilitation is a marathon, not a sprint. Take your blood pressure readings at the same time each morning." }
      ]
    },
    {
      id: "grp_pediatrics",
      name: "Pediatric Parent Support",
      members: 210,
      avatar: "🧸",
      description: "Parents sharing advice on child nutrition, vaccination schedules, infant care, and common children diseases.",
      messages: [
        { sender: "Dr. Marcus Vance", time: "2 days ago", text: "Hi parents! The local RSV virus cases are rising. Remember to sanitize toys regularly and keep kids home if they show any runny nose symptoms." }
      ]
    }
  ],

  // Conversations (Direct Messaging)
  chats: {
    "doctor_sarah": [
      { sender: "Dr. Sarah Lin", text: "Hi John, how are you feeling with the new Lisinopril dosage?", time: "Yesterday, 4:30 PM" },
      { sender: "patient_john", text: "Hi Doctor! I had a slight cough on the second day, but it went away. My blood pressure reading has been 122/80 on average.", time: "Yesterday, 4:45 PM" },
      { sender: "Dr. Sarah Lin", text: "That is excellent. Keep logging your daily stats. Let's see each other in clinic next month.", time: "Yesterday, 5:00 PM" }
    ],
    "staff_james": [
      { sender: "patient_john", text: "Hi Nurse James, is my blood sample result ready from this morning?", time: "Today, 9:00 AM" },
      { sender: "staff_james", text: "Hello John! Yes, the lab has processed it and uploaded it to your profile under reports.", time: "Today, 9:15 AM" }
    ],
    "doctor_vance": [
      { sender: "doctor_vance", text: "Hello, ready for your child's vaccination checkup tomorrow?", time: "Yesterday, 2:00 PM" }
    ]
  },

  // Hospital Management Datastores
  appointments: [
    { id: "apt_1", patientName: "John Doe", age: 45, doctor: "Dr. Sarah Lin", date: "2026-06-12", time: "10:30 AM", reason: "Diabetes & Hypertension Followup", status: "Scheduled" },
    { id: "apt_2", patientName: "Alice Cooper", age: 38, doctor: "Dr. Elena Rostova", date: "2026-06-13", time: "11:15 AM", reason: "Chronic Migraine Evaluation", status: "Scheduled" },
    { id: "apt_3", patientName: "Robert Dow", age: 60, doctor: "Dr. Sarah Lin", date: "2026-06-08", time: "09:00 AM", reason: "Electrocardiogram Review", status: "Completed" },
    { id: "apt_4", patientName: "Clara Croft", age: 5, doctor: "Dr. Marcus Vance", date: "2026-06-15", time: "02:00 PM", reason: "Annual Growth Assessment", status: "Scheduled" }
  ],

  beds: [
    { ward: "General Ward A", total: 20, occupied: 15, details: [
      { bed: "Bed 01", patient: "Arthur Dent", condition: "Pneumonia", doctor: "Dr. Sarah Lin" },
      { bed: "Bed 02", patient: "Clara Oswald", condition: "Asthma Flare", doctor: "Dr. Marcus Vance" }
    ]},
    { ward: "Intensive Care Unit (ICU)", total: 8, occupied: 6, details: [
      { bed: "Bed I-01", patient: "Bruce Banner", condition: "Acute Cardio Incident", doctor: "Dr. Sarah Lin" },
      { bed: "Bed I-02", patient: "Tony Stark", condition: "Toxicity Management", doctor: "Dr. Elena Rostova" }
    ]},
    { ward: "Maternity Ward C", total: 15, occupied: 8, details: [
      { bed: "Bed M-01", patient: "Diana Prince", condition: "Post-natal Recovery", doctor: "Dr. Marcus Vance" }
    ]}
  ],

  pharmacy: [
    { id: "ph_1", name: "Metformin 500mg", category: "Antidiabetic", stock: 1200, unit: "Tablets", location: "Shelf A-3", status: "In Stock" },
    { id: "ph_2", name: "Lisinopril 10mg", category: "Antihypertensive", stock: 850, unit: "Tablets", location: "Shelf B-1", status: "In Stock" },
    { id: "ph_3", name: "Amoxicillin 250mg", category: "Antibiotic", stock: 90, unit: "Capsules", location: "Shelf C-4", status: "Low Stock" },
    { id: "ph_4", name: "Atorvastatin 20mg", category: "Cardiovascular", stock: 600, unit: "Tablets", location: "Shelf A-1", status: "In Stock" },
    { id: "ph_5", name: "Insulin Glargine 100 U/mL", category: "Antidiabetic", stock: 15, unit: "Vials", location: "Cold Storage 2", status: "Low Stock" }
  ]
};

// Expose database to window so app.js can access and manipulate it
window.MediConnectDB = JSON.parse(localStorage.getItem('mediconnect_db')) || initialDatabase;

window.saveMediConnectDB = function() {
  localStorage.setItem('mediconnect_db', JSON.stringify(window.MediConnectDB));
};
