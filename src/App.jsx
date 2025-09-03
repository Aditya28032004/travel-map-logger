import './App.css';
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
    "grand canyon": [36.1069, -112.1129]
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
  const [authTab, setAuthTab] = useState("login"); // 'login' or 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const mapRef = useRef();

  // Load users from localStorage on initial render
  useEffect(() => {
    const savedUsers = localStorage.getItem("travelLoggerUsers");
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    }
    
    // Check if user is already logged in
    const loggedInUser = localStorage.getItem("travelLoggerCurrentUser");
    if (loggedInUser) {
      setIsLoggedIn(true);
      setCurrentUser(JSON.parse(loggedInUser));
    }
  }, []);

  // Save users to localStorage whenever users change
  useEffect(() => {
    localStorage.setItem("travelLoggerUsers", JSON.stringify(users));
  }, [users]);

  // Load trips and wishlist from localStorage when user changes
  useEffect(() => {
    if (currentUser) {
      const userTripsKey = `travelLoggerTrips_${currentUser.id}`;
      const userWishlistKey = `travelLoggerWishlist_${currentUser.id}`;
      
      const savedTrips = localStorage.getItem(userTripsKey);
      const savedWishlist = localStorage.getItem(userWishlistKey);
      
      if (savedTrips) {
        setTrips(JSON.parse(savedTrips));
      } else {
        setTrips([]);
      }
      
      if (savedWishlist) {
        setWishlist(JSON.parse(savedWishlist));
      } else {
        setWishlist([]);
      }
    }
  }, [currentUser]);

  // Save trips to localStorage whenever trips change
  useEffect(() => {
    if (currentUser) {
      const userTripsKey = `travelLoggerTrips_${currentUser.id}`;
      localStorage.setItem(userTripsKey, JSON.stringify(trips));
    }
  }, [trips, currentUser]);

  // Save wishlist to localStorage whenever wishlist changes
  useEffect(() => {
    if (currentUser) {
      const userWishlistKey = `travelLoggerWishlist_${currentUser.id}`;
      localStorage.setItem(userWishlistKey, JSON.stringify(wishlist));
    }
  }, [wishlist, currentUser]);

  // Authentication functions
  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setIsLoggedIn(true);
      setCurrentUser(user);
      localStorage.setItem("travelLoggerCurrentUser", JSON.stringify(user));
      setEmail("");
      setPassword("");
    } else {
      alert("Invalid email or password");
    }
  };

  const handleSignup = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords don't match");
      return;
    }
    
    if (users.some(u => u.email === email)) {
      alert("User with this email already exists");
      return;
    }
    
    const newUser = {
      id: Date.now(),
      name,
      email,
      password
    };
    
    setUsers([...users, newUser]);
    setIsLoggedIn(true);
    setCurrentUser(newUser);
    localStorage.setItem("travelLoggerCurrentUser", JSON.stringify(newUser));
    
    // Clear form
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem("travelLoggerCurrentUser");
    setTrips([]);
    setWishlist([]);
  };

  const handleAddOrUpdateTrip = () => {
    if (!title || !location) {
      alert("Please enter at least title and location.");
      return;
    }

    const coordinates = getCoordinatesForLocation(location);
    
    const tripData = {
      id: editingTrip ? editingTrip.id : Date.now(),
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
    };

    if (editingTrip) {
      setTrips(trips.map(trip => trip.id === editingTrip.id ? tripData : trip));
      setEditingTrip(null);
    } else {
      setTrips([...trips, tripData]);
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

  const handleDeleteTrip = (id) => {
    if (window.confirm("Are you sure you want to delete this trip?")) {
      setTrips(trips.filter((trip) => trip.id !== id));
    }
  };

  const handleFileUpload = (e, type) => {
    const files = Array.from(e.target.files);
    const urls = files.map((file) => URL.createObjectURL(file));
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
  const addToWishlist = (trip) => {
    if (!wishlist.some(item => item.id === trip.id)) {
      const coordinates = getCoordinatesForLocation(trip.location);
      setWishlist([...wishlist, {...trip, isWishlist: true, coordinates}]);
    }
  };

  const removeFromWishlist = (id) => {
    setWishlist(wishlist.filter(item => item.id !== id));
  };

  const moveWishlistToTrips = (wishlistItem) => {
    removeFromWishlist(wishlistItem.id);
    const {isWishlist, ...trip} = wishlistItem;
    setTrips([...trips, trip]);
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
          <span>Welcome, {currentUser?.name || currentUser?.email}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${tab === "home" ? "active" : ""}`}
          onClick={() => {
            setTab("home");
            setShowWishlist(false);
          }}
        >
          🏠 Home
        </button>
        <button
          className={`tab ${tab === "add" && !showWishlist ? "active" : ""}`}
          onClick={() => {
            setTab("add");
            setShowWishlist(false);
            setEditingTrip(null);
          }}
        >
          {editingTrip ? "✏️ Edit Trip" : "➕ Add Trip"}
        </button>
        <button
          className={`tab ${tab === "view" && !showWishlist ? "active" : ""}`}
          onClick={() => {
            setTab("view");
            setShowWishlist(false);
          }}
        >
          📖 All Trips ({trips.length})
        </button>
        <button
          className={`tab ${showWishlist ? "active" : ""}`}
          onClick={() => setShowWishlist(true)}
        >
          ⭐ Wishlist ({wishlist.length})
        </button>
      </div>

      {/* Home Page */}
      {tab === "home" && (
        <div className="home-page">
          <div className="welcome-section">
            <h2>Welcome to Your Travel Journal</h2>
            <p>Keep track of your adventures around the world</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📍</div>
              <div className="stat-number">{trips.length}</div>
              <div className="stat-label">Trips Taken</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🌎</div>
              <div className="stat-number">{countriesVisited}</div>
              <div className="stat-label">Destinations Visited</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-number">{averageRating}</div>
              <div className="stat-label">Average Rating</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-number">${totalExpenses.toFixed(2)}</div>
              <div className="stat-label">Total Expenses</div>
            </div>
          </div>

          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <div className="action-buttons">
              <button className="action-btn" onClick={() => setTab("add")}>
                <span className="action-icon">➕</span>
                <span>Add New Trip</span>
              </button>
              <button className="action-btn" onClick={() => setTab("view")}>
                <span className="action-icon">📖</span>
                <span>View All Trips</span>
              </button>
              <button className="action-btn" onClick={() => setShowWishlist(true)}>
                <span className="action-icon">⭐</span>
                <span>Wishlist</span>
              </button>
            </div>
          </div>

          {trips.length > 0 && (
            <div className="recent-trips">
              <h3>Recent Trips</h3>
              <div className="trip-highlights">
                {trips.slice(0, 3).map(trip => (
                  <div key={trip.id} className="trip-highlight">
                    <h4>{trip.title}</h4>
                    <p>{trip.location} • {trip.date && new Date(trip.date).toLocaleDateString()}</p>
                    <div className="trip-rating">
                      {"★".repeat(trip.rating || 0)}{"☆".repeat(5 - (trip.rating || 0))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {wishlist.length > 0 && (
            <div className="wishlist-preview">
              <h3>Your Wishlist</h3>
              <div className="wishlist-items">
                {wishlist.slice(0, 3).map(item => (
                  <div key={item.id} className="wishlist-item">
                    <h4>{item.title} ⭐</h4>
                    <p>{item.location}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {trips.length === 0 && (
            <div className="empty-state">
              <h3>Start Your Travel Journey</h3>
              <p>You haven't added any trips yet. Click the button below to record your first adventure!</p>
              <button className="cta-button" onClick={() => setTab("add")}>
                Add Your First Trip
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Trip Form */}
      {tab === "add" && !showWishlist && (
        <div className="form-section">
          <input
            type="text"
            placeholder="Trip Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="text"
            placeholder="Location *"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <input
            type="text"
            placeholder="Companions (comma separated)"
            value={companions}
            onChange={(e) => setCompanions(e.target.value)}
          />
          
          <div className="date-range">
            <input
              type="date"
              placeholder="Start Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Category:</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="vacation">Vacation</option>
                <option value="business">Business</option>
                <option value="adventure">Adventure</option>
                <option value="family">Family Visit</option>
                <option value="romantic">Romantic Getaway</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Rating:</label>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`star ${star <= rating ? "filled" : ""}`}
                    onClick={() => setRating(star)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <label>Weather:</label>
            <select value={weather} onChange={(e) => setWeather(e.target.value)}>
              <option value="">Select weather</option>
              <option value="sunny">Sunny</option>
              <option value="cloudy">Cloudy</option>
              <option value="rainy">Rainy</option>
              <option value="snowy">Snowy</option>
              <option value="windy">Windy</option>
            </select>
          </div>
          
          <label>Expenses:</label>
          {expenses.map((expense, index) => (
            <div key={index} className="expense-row">
              <input
                type="text"
                placeholder="Item"
                value={expense.item}
                onChange={(e) => updateExpenseField(index, "item", e.target.value)}
              />
              <input
                type="number"
                placeholder="Cost"
                value={expense.cost}
                onChange={(e) => updateExpenseField(index, "cost", e.target.value)}
              />
              <button 
                className="remove-btn"
                onClick={() => removeExpenseField(index)}
                disabled={expenses.length === 1}
              >
                −
              </button>
            </div>
          ))}
          <button type="button" onClick={addExpenseField} className="add-expense-btn">
            + Add Expense
          </button>
          
          <textarea
            placeholder="Trip Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          
          <label>Upload Images:</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileUpload(e, "image")}
          />
          <label>Upload Videos:</label>
          <input
            type="file"
            multiple
            accept="video/*"
            onChange={(e) => handleFileUpload(e, "video")}
          />
          
          <div className="media-previews">
            {images.map((img, i) => (
              <div key={i} className="media-preview">
                <img src={img} alt="preview" />
                <button onClick={() => setImages(images.filter((_, idx) => idx !== i))}>
                  ×
                </button>
              </div>
            ))}
            {videos.map((vid, i) => (
              <div key={i} className="media-preview">
                <video src={vid} />
                <button onClick={() => setVideos(videos.filter((_, idx) => idx !== i))}>
                  ×
                </button>
              </div>
            ))}
          </div>
          
          <button onClick={handleAddOrUpdateTrip}>
            {editingTrip ? "Update Trip" : "Add Trip"}
          </button>
          
          {editingTrip && (
            <button 
              className="cancel-btn"
              onClick={() => {
                setEditingTrip(null);
                setTab("view");
              }}
            >
              Cancel Edit
            </button>
          )}
        </div>
      )}

      {/* View Trips */}
      {tab === "view" && !showWishlist && (
        <>
          <div className="view-controls">
            <input
              type="text"
              className="search-bar"
              placeholder="Search trips..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            
            <div className="view-options">
              <button 
                className={`view-btn ${viewMode === "cards" ? "active" : ""}`}
                onClick={() => setViewMode("cards")}
              >
                📋 Cards
              </button>
              <button 
                className={`view-btn ${viewMode === "timeline" ? "active" : ""}`}
                onClick={() => setViewMode("timeline")}
              >
                📅 Timeline
              </button>
              <button 
                className={`view-btn ${viewMode === "map" ? "active" : ""}`}
                onClick={() => setViewMode("map")}
              >
                🗺️ Map
              </button>
            </div>
            
            <div className="export-controls">
              <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
              <button onClick={exportData} className="export-btn">
                Export Data
              </button>
            </div>
          </div>
          
          {viewMode === "cards" && (
            <div className="memory-list">
              <AnimatePresence>
                {filteredTrips.map((trip) => (
                  <motion.div
                    key={trip.id}
                    className="memory-card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="card-header">
                      <h2>{trip.title}</h2>
                      <span className={`category-tag ${trip.category}`}>
                        {trip.category}
                      </span>
                    </div>
                    
                    <p><b>Location:</b> {trip.location}</p>
                    {trip.companions && <p><b>Companions:</b> {trip.companions}</p>}
                    
                    <div className="trip-dates">
                      {trip.date && <p><b>Start:</b> {new Date(trip.date).toLocaleDateString()}</p>}
                      {trip.endDate && <p><b>End:</b> {new Date(trip.endDate).toLocaleDateString()}</p>}
                    </div>
                    
                    {trip.rating > 0 && (
                      <p><b>Rating:</b> {"★".repeat(trip.rating)}{"☆".repeat(5 - trip.rating)}</p>
                    )}
                    
                    {trip.weather && (
                      <p><b>Weather:</b> 
                        {trip.weather === "sunny" && " ☀️ Sunny"}
                        {trip.weather === "cloudy" && " ☁️ Cloudy"}
                        {trip.weather === "rainy" && " 🌧️ Rainy"}
                        {trip.weather === "snowy" && " ❄️ Snowy"}
                        {trip.weather === "windy" && " 💨 Windy"}
                      </p>
                    )}
                    
                    {trip.expenses && trip.expenses.length > 0 && (
                      <div className="expenses-section">
                        <b>Expenses:</b>
                        <ul>
                          {trip.expenses.map((expense, idx) => (
                            <li key={idx}>{expense.item}: ${parseFloat(expense.cost).toFixed(2)}</li>
                          ))}
                        </ul>
                        <p><b>Total:</b> ${calculateTotalExpenses(trip.expenses).toFixed(2)}</p>
                      </div>
                    )}
                    
                    {trip.notes && <p className="trip-notes">{trip.notes}</p>}

                    <div className="media-section">
                      {trip.images && trip.images.map((img, i) => (
                        <div key={i} className="media-item">
                          <img
                            src={img}
                            alt="trip"
                            onClick={() => setSelectedMedia({ type: "image", src: img })}
                          />
                          <a href={img} download className="download-btn">⬇️</a>
                        </div>
                      ))}
                      {trip.videos && trip.videos.map((vid, i) => (
                        <div key={i} className="media-item">
                          <video
                            src={vid}
                            controls
                            onClick={() => setSelectedMedia({ type: "video", src: vid })}
                          />
                          <a href={vid} download className="download-btn">⬇️</a>
                        </div>
                      ))}
                    </div>

                    <div className="card-actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleEditTrip(trip)}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteTrip(trip.id)}
                      >
                        Delete
                      </button>
                      {!wishlist.some(item => item.id === trip.id) ? (
                        <button
                          className="wishlist-btn"
                          onClick={() => addToWishlist(trip)}
                          title="Add to wishlist"
                        >
                          ⭐
                        </button>
                      ) : (
                        <button
                          className="wishlist-remove-btn"
                          onClick={() => removeFromWishlist(trip.id)}
                          title="Remove from wishlist"
                        >
                          ❌
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          
          {viewMode === "timeline" && (
            <div className="timeline-view">
              {filteredTrips
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((trip, index) => (
                  <div key={trip.id} className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <h3>{trip.title}</h3>
                      <p>{trip.location} • {new Date(trip.date).toLocaleDateString()}</p>
                      <p className="trip-category">{trip.category}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
          
          {viewMode === "map" && (
            <div className="map-view">
              <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: '400px', width: '100%', borderRadius: '15px' }}
                ref={mapRef}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Trip markers */}
                {filteredTrips.map(trip => (
                  trip.coordinates && (
                    <Marker 
                      key={`trip-${trip.id}`} 
                      position={trip.coordinates}
                      icon={visitedIcon}
                    >
                      <Popup>
                        <div>
                          <h3>{trip.title}</h3>
                          <p>{trip.location}</p>
                          <p>Visited: {trip.date && new Date(trip.date).toLocaleDateString()}</p>
                          <p>Rating: {"★".repeat(trip.rating)}{"☆".repeat(5 - trip.rating)}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )
                ))}
                
                {/* Wishlist markers */}
                {filteredWishlist.map(item => (
                  item.coordinates && (
                    <Marker 
                      key={`wishlist-${item.id}`} 
                      position={item.coordinates}
                      icon={wishlistIcon}
                    >
                      <Popup>
                        <div>
                          <h3>{item.title} ⭐</h3>
                          <p>{item.location}</p>
                          <p>Wishlist destination</p>
                        </div>
                      </Popup>
                    </Marker>
                  )
                ))}
              </MapContainer>
              
              <div className="map-legend">
                <div className="legend-item">
                  <div className="legend-color visited"></div>
                  <span>Visited Locations</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color wishlist"></div>
                  <span>Wishlist Locations</span>
                </div>
              </div>
              
              <button onClick={fitMapToMarkers} className="fit-map-btn">
                Fit Map to Markers
                </button>
            </div>
          )}
        </>
      )}

      {/* Wishlist View */}
      {showWishlist && (
        <div className="wishlist-section">
          <div className="view-controls">
            <input
              type="text"
              className="search-bar"
              placeholder="Search wishlist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <h2>Your Travel Wishlist ({wishlist.length})</h2>
          {filteredWishlist.length === 0 ? (
            <p className="empty-state">Your wishlist is empty. Add some dream destinations!</p>
          ) : (
            <div className="memory-list">
              <AnimatePresence>
                {filteredWishlist.map((item) => (
                  <motion.div
                    key={item.id}
                    className="memory-card wishlist-card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="card-header">
                      <h2>{item.title} ⭐</h2>
                      <span className={`category-tag ${item.category}`}>
                        {item.category}
                      </span>
                    </div>
                    
                    <p><b>Location:</b> {item.location}</p>
                    {item.notes && <p className="trip-notes">{item.notes}</p>}

                    <div className="card-actions">
                      <button
                        className="move-to-trips-btn"
                        onClick={() => moveWishlistToTrips(item)}
                      >
                        Mark as Completed
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => removeFromWishlist(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Media Modal */}
      {selectedMedia && (
        <div className="media-modal" onClick={() => setSelectedMedia(null)}>
          <button className="close-modal" onClick={() => setSelectedMedia(null)}>
            ×
          </button>
          {selectedMedia.type === "image" ? (
            <img src={selectedMedia.src} alt="fullscreen" />
          ) : (
            <video src={selectedMedia.src} controls autoPlay />
          )}
        </div>
      )}
    </div>
  );
}