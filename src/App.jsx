import './App.css';
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Firebase imports
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject
} from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCWYM5ktbrjNr36MnNPwkj8PKv6ys_dQOs",
  authDomain: "travel-map-logger.firebaseapp.com",
  projectId: "travel-map-logger",
  storageBucket: "travel-map-logger.firebasestorage.app",
  messagingSenderId: "424735963953",
  appId: "1:424735963953:web:2b378a25e4b24e7dfd4e10",
  measurementId: "G-HBRFXM2LG7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for visited locations
const visitedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icon for wishlist locations
const wishlistIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Mock function to get coordinates from location name
const getCoordinatesForLocation = (location) => {
  const locationMap = {
    "paris": [48.8566, 2.3522],
    "london": [51.5074, -0.1278],
    "new york": [40.7128, -74.0060],
    "tokyo": [35.6895, 139.6917],
    "rome": [41.9028, 12.4964],
    "sydney": [-33.8688, 151.2093],
    "cairo": [30.0444, 31.2357],
    "rio de janeiro": [-22.9068, -43.1729],
    "barcelona": [41.3851, 2.1734],
    "dubai": [25.2048, 55.2708],
    "amsterdam": [52.3676, 4.9041],
    "berlin": [52.5200, 13.4050],
    "prague": [50.0755, 14.4378],
    "venice": [45.4408, 12.3155],
    "kyoto": [35.0116, 135.7681],
    "bangkok": [13.7563, 100.5018],
    "bali": [-8.3405, 115.0920],
    "santorini": [36.3932, 25.4615],
    "machu picchu": [-13.1631, -72.5450],
    "grand canyon": [36.1069, -112.1129],
    "delhi":[28.644800, 77.216721]
  };
  
  const normalizedLocation = location.toLowerCase();
  return locationMap[normalizedLocation] || [20, 0];
};

export default function App() {
  const [tab, setTab] = useState("home");
  const [viewMode, setViewMode] = useState("cards");
  const [trips, setTrips] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [showWishlist, setShowWishlist] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [companions, setCompanions] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("vacation");
  const [rating, setRating] = useState(0);
  const [weather, setWeather] = useState("");
  const [expenses, setExpenses] = useState([{ item: "", cost: "" }]);
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [exportFormat, setExportFormat] = useState("json");
  
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authTab, setAuthTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const mapRef = useRef();

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        });
        loadUserData(user.uid);
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
        setTrips([]);
        setWishlist([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load user's trips and wishlist from Firestore
  const loadUserData = (userId) => {
    // Load trips
    const tripsQuery = query(
      collection(db, "trips"), 
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribeTrips = onSnapshot(tripsQuery, (snapshot) => {
      const tripsData = [];
      snapshot.forEach((doc) => {
        tripsData.push({ id: doc.id, ...doc.data() });
      });
      setTrips(tripsData);
    }, (error) => {
      console.error("Error loading trips:", error);
    });
    
    // Load wishlist
    const wishlistQuery = query(
      collection(db, "wishlist"), 
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribeWishlist = onSnapshot(wishlistQuery, (snapshot) => {
      const wishlistData = [];
      snapshot.forEach((doc) => {
        wishlistData.push({ id: doc.id, ...doc.data() });
      });
      setWishlist(wishlistData);
    }, (error) => {
      console.error("Error loading wishlist:", error);
    });
    
    return () => {
      unsubscribeTrips();
      unsubscribeWishlist();
    };
  };

  // Authentication functions
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // The onAuthStateChanged listener will handle the rest
      setEmail("");
      setPassword("");
    } catch (error) {
      setAuthError("Invalid email or password: " + error.message);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setAuthError("");
    
    if (password !== confirmPassword) {
      setAuthError("Passwords don't match");
      return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile with name
      await updateProfile(userCredential.user, {
        displayName: name
      });
      
      // Create user document in Firestore
      await addDoc(collection(db, "users"), {
        uid: userCredential.user.uid,
        name: name,
        email: email,
        createdAt: serverTimestamp()
      });
      
      // The onAuthStateChanged listener will handle the rest
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setAuthError("User with this email already exists");
      } else {
        setAuthError("Error creating account: " + error.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // The onAuthStateChanged listener will handle the rest
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleAddOrUpdateTrip = async () => {
    if (!title || !location) {
      alert("Please enter at least title and location.");
      return;
    }

    const coordinates = getCoordinatesForLocation(location);
    
    const tripData = {
      title,
      location,
      coordinates,
      companions,
      date,
      endDate,
      notes,
      category,
      rating,
      weather,
      expenses: expenses.filter(exp => exp.item && exp.cost),
      images,
      videos,
      userId: currentUser.uid,
      createdAt: editingTrip ? editingTrip.createdAt : serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      if (editingTrip) {
        // Update existing trip
        await updateDoc(doc(db, "trips", editingTrip.id), tripData);
        setEditingTrip(null);
      } else {
        // Add new trip
        await addDoc(collection(db, "trips"), tripData);
      }

      // Reset form
      setTitle("");
      setLocation("");
      setCompanions("");
      setDate("");
      setEndDate("");
      setNotes("");
      setCategory("vacation");
      setRating(0);
      setWeather("");
      setExpenses([{ item: "", cost: "" }]);
      setImages([]);
      setVideos([]);
      
      setTab("view");
    } catch (error) {
      alert("Error saving trip: " + error.message);
    }
  };

  const handleEditTrip = (trip) => {
    setEditingTrip(trip);
    setTitle(trip.title);
    setLocation(trip.location);
    setCompanions(trip.companions || "");
    setDate(trip.date || "");
    setEndDate(trip.endDate || "");
    setNotes(trip.notes || "");
    setCategory(trip.category || "vacation");
    setRating(trip.rating || 0);
    setWeather(trip.weather || "");
    setExpenses(trip.expenses && trip.expenses.length > 0 
      ? trip.expenses 
      : [{ item: "", cost: "" }]);
    setImages(trip.images || []);
    setVideos(trip.videos || []);
    setTab("add");
  };

  const handleDeleteTrip = async (id) => {
    if (window.confirm("Are you sure you want to delete this trip?")) {
      try {
        // First, delete associated media files
        const tripToDelete = trips.find(trip => trip.id === id);
        if (tripToDelete) {
          // Delete images
          for (const imageUrl of tripToDelete.images || []) {
            try {
              const imageRef = ref(storage, imageUrl);
              await deleteObject(imageRef);
            } catch (error) {
              console.error("Error deleting image:", error);
            }
          }
          
          // Delete videos
          for (const videoUrl of tripToDelete.videos || []) {
            try {
              const videoRef = ref(storage, videoUrl);
              await deleteObject(videoRef);
            } catch (error) {
              console.error("Error deleting video:", error);
            }
          }
        }
        
        // Then delete the trip document
        await deleteDoc(doc(db, "trips", id));
      } catch (error) {
        alert("Error deleting trip: " + error.message);
      }
    }
  };

  const handleFileUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    const urls = [];
    
    for (const file of files) {
      try {
        // Create a storage reference
        const storageRef = ref(storage, `uploads/${currentUser.uid}/${Date.now()}_${file.name}`);
        
        // Upload file
        const snapshot = await uploadBytes(storageRef, file);
        
        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        urls.push(downloadURL);
      } catch (error) {
        alert("Error uploading file: " + error.message);
      }
    }
    
    if (type === "image") {
      setImages((prev) => [...prev, ...urls]);
    } else {
      setVideos((prev) => [...prev, ...urls]);
    }
  };

  const addExpenseField = () => {
    setExpenses([...expenses, { item: "", cost: "" }]);
  };

  const removeExpenseField = (index) => {
    if (expenses.length > 1) {
      setExpenses(expenses.filter((_, i) => i !== index));
    }
  };

  const updateExpenseField = (index, field, value) => {
    const newExpenses = [...expenses];
    newExpenses[index][field] = value;
    setExpenses(newExpenses);
  };

  const calculateTotalExpenses = (tripExpenses) => {
    return tripExpenses.reduce((total, expense) => total + parseFloat(expense.cost || 0), 0);
  };

  // Wishlist functions
  const addToWishlist = async (trip) => {
    if (!wishlist.some(item => item.tripId === trip.id)) {
      const coordinates = getCoordinatesForLocation(trip.location);
      
      try {
        await addDoc(collection(db, "wishlist"), {
          ...trip,
          isWishlist: true,
          coordinates,
          userId: currentUser.uid,
          tripId: trip.id,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        alert("Error adding to wishlist: " + error.message);
      }
    }
  };

  const removeFromWishlist = async (id) => {
    try {
      await deleteDoc(doc(db, "wishlist", id));
    } catch (error) {
      alert("Error removing from wishlist: " + error.message);
    }
  };

  const moveWishlistToTrips = async (wishlistItem) => {
    try {
      // Add to trips
      const { isWishlist, userId, tripId, id: wishlistId, ...tripData } = wishlistItem;
      await addDoc(collection(db, "trips"), {
        ...tripData,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      
      // Remove from wishlist
      await deleteDoc(doc(db, "wishlist", wishlistItem.id));
    } catch (error) {
      alert("Error moving to trips: " + error.message);
    }
  };

  const filteredTrips = trips.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.location.toLowerCase().includes(search.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredWishlist = wishlist.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.location.toLowerCase().includes(search.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(search.toLowerCase()))
  );

  const exportData = () => {
    let dataStr, fileExtension;
    
    if (exportFormat === "json") {
      dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trips, null, 2));
      fileExtension = "json";
    } else {
      // CSV format
      const headers = ["Title", "Location", "Date", "Category", "Rating", "Total Expenses"];
      const csvData = trips.map(trip => [
        `"${trip.title}"`,
        `"${trip.location}"`,
        `"${trip.date}"`,
        `"${trip.category}"`,
        trip.rating,
        calculateTotalExpenses(trip.expenses || [])
      ]);
      
      const csvContent = [headers, ...csvData].map(row => row.join(",")).join("\n");
      dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
      fileExtension = "csv";
    }
    
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `travel_logs.${fileExtension}`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Function to fit map to show all markers
  const fitMapToMarkers = () => {
    if (mapRef.current && (filteredTrips.length > 0 || filteredWishlist.length > 0)) {
      const map = mapRef.current;
      const group = new L.featureGroup();
      
      // Add trip markers
      filteredTrips.forEach(trip => {
        if (trip.coordinates) {
          L.marker(trip.coordinates).addTo(group);
        }
      });
      
      // Add wishlist markers
      filteredWishlist.forEach(item => {
        if (item.coordinates) {
          L.marker(item.coordinates).addTo(group);
        }
      });
      
      if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds().pad(0.1));
      }
    }
  };

  // Fit map when filtered trips or wishlist changes in map view
  useEffect(() => {
    if (viewMode === "map") {
      setTimeout(fitMapToMarkers, 100);
    }
  }, [filteredTrips, filteredWishlist, viewMode]);

  // Calculate statistics for home page
  const totalExpenses = trips.reduce((total, trip) => total + calculateTotalExpenses(trip.expenses || []), 0);
  const countriesVisited = new Set(trips.map(trip => trip.location)).size;
  const averageRating = trips.length > 0 ? (trips.reduce((sum, trip) => sum + (trip.rating || 0), 0) / trips.length).toFixed(1) : 0;

  // Show loading state
  if (loading) {
    return (
      <div className="app">
        <div className="loading-container">
          <h1 className="title">🌍 Travel & Journey Logger</h1>
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  // If user is not logged in, show authentication page
  if (!isLoggedIn) {
    return (
      <div className="app">
        <h1 className="title">🌍 Travel & Journey Logger</h1>
        
        <div className="auth-container">
          <div className="auth-tabs">
            <button 
              className={`auth-tab ${authTab === "login" ? "active" : ""}`}
              onClick={() => setAuthTab("login")}
            >
              Login
            </button>
            <button 
              className={`auth-tab ${authTab === "signup" ? "active" : ""}`}
              onClick={() => setAuthTab("signup")}
            >
              Sign Up
            </button>
          </div>
          
          {authError && <div className="auth-error">{authError}</div>}
          
          {authTab === "login" ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <h2>Login to Your Account</h2>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="submit">Login</button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSignup}>
              <h2>Create a New Account</h2>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button type="submit">Sign Up</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Main app content for logged-in users
  return (
    <div className="app">
      <div className="app-header">
        <h1 className="title">🌍 Travel & Journey Logger</h1>
        <div className="user-info">
          <span>Welcome, {currentUser?.displayName || currentUser?.email}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* Rest of your component remains the same */}
      {/* ... */}
    </div>
  );
}
