// src/pages/Profile.jsx
import { useState, useEffect } from "react";
import { auth, db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, getDoc } from "firebase/firestore";
import "./Profile.css";
export default function Profile() {
  const user = auth.currentUser;

  const [form, setForm] = useState({
    name: "",
    fatherName: "",
    address: "",
    country: "", // country + flag combined label
    phone: "",
    class: "",
    school: "",
    city: "",
    age: "",
    status: "",
    gender: "",
  });

  const [profilePic, setProfilePic] = useState(null);
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);

  const [profilePicURLPreview, setProfilePicURLPreview] = useState("");
  const [loading, setLoading] = useState(false);

  // Level system
  const [level, setLevel] = useState(1);   // 1–100
  const [points, setPoints] = useState(0); // 0–100 per level

  // Load existing profile if exists
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setForm((prev) => ({
            ...prev,
            name: data.name || "",
            fatherName: data.fatherName || "",
            address: data.address || "",
            country: data.country || "",
            phone: data.phone || "",
            class: data.class || "",
            school: data.school || "",
            city: data.city || "",
            age: data.age || "",
            status: data.status || "",
            gender: data.gender || "",
          }));
          if (data.profilePicURL) setProfilePicURLPreview(data.profilePicURL);
          setLevel(data.level || 1);
          setPoints(data.points || 0);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      }
    }
    loadProfile();
  }, [user]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function uploadImage(file, path) {
    if (!file) return "";
    const storageRef = ref(storage, `${path}/${user.uid}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }

  function validateForm() {
    // Required text/select fields
    const requiredFields = [
      "name",
      "fatherName",
      "address",
      "country",
      "phone",
      "class",
      "school",
      "city",
      "age",
      "status",
      "gender",
    ];

    for (const field of requiredFields) {
      if (!form[field] || String(form[field]).trim() === "") {
        alert(`Please fill the field: ${field}`);
        return false;
      }
    }

    if (!profilePic && !profilePicURLPreview) {
      alert("Please upload a profile picture.");
      return false;
    }
    /*if (!idFront) {
      alert("Please upload ID card front image.");
      return false;
    }
    if (!idBack) {
      alert("Please upload ID card back image.");
      return false;
    */

    return true;
  }

  async function saveProfile() {
    if (!user) {
      alert("No user found. Please log in again.");
      return;
    }

    if (!validateForm()) return;

    try {
      setLoading(true);

      const profilePicURL = profilePic
        ? await uploadImage(profilePic, "profilePic")
        : profilePicURLPreview || "";

      /*const idFrontURL = await uploadImage(idFront, "idFront");
      const idBackURL = await uploadImage(idBack, "idBack");*/

      await setDoc(
        doc(db, "users", user.uid),
        {
          ...form,
          email: user.email,
          profilePicURL,
          level,
          points,
          updatedAt: new Date(),
          createdAt: new Date(),
        },
        { merge: true }
      );

      alert("Profile Saved Successfully!");
    } catch (error) {
      console.error(error);
      alert("Error saving profile: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  // GAME-LIKE level progress (ready to connect with exam results)
  const levelProgressPercent = Math.min(100, Math.max(0, (points / 100) * 100));

  return (
    <div className="profile-page">
      {/* Top branding */}
      <header className="profile-header">
        <h1 className="profile-logo">X ACADEMY</h1>
        <p className="profile-subtitle">Student Profile & Level Progress</p>
      </header>

      {/* Profile card */}
      <div className="profile-card">
        {/* Profile picture circular UI */}
        <div className="profile-avatar-section">
          <div className="profile-avatar-wrapper">
            {profilePicURLPreview ? (
              <img
                src={profilePicURLPreview}
                alt="Profile"
                className="profile-avatar-image"
              />
            ) : (
              <div className="profile-avatar-placeholder">Add Photo</div>
            )}
          </div>
          <label className="profile-upload-label">
            Upload Profile Picture
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                setProfilePic(file);
                if (file) {
                  const url = URL.createObjectURL(file);
                  setProfilePicURLPreview(url);
                }
              }}
            />
          </label>
        </div>

        {/* Level system - game style */}
        <section className="profile-level-section">
          <h2 className="level-title">Level Progress</h2>
          <p className="level-info">
            Level: <strong>{level}</strong> / 100
          </p>
          <p className="level-info">
            Points in this level: <strong>{points}</strong> / 100
          </p>
          <div className="level-progress-bar">
            <div
              className="level-progress-fill"
              style={{ width: `${levelProgressPercent}%` }}
            ></div>
          </div>
          <p className="level-hint">
            Win a paper: +5 points | Lose a paper: −1 point.
            <br />
            When points reach 100, level up to next level.
          </p>
        </section>

        {/* Profile form fields */}
        <section className="profile-form-section">
          <h2 className="profile-section-title">Personal Details</h2>

          <div className="profile-grid">
            <input
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
            />
            <input
              name="fatherName"
              placeholder="Father's Name"
              value={form.fatherName}
              onChange={handleChange}
            />
            <input
              name="address"
              placeholder="Home Address"
              value={form.address}
              onChange={handleChange}
            />
            <input
              name="phone"
              placeholder="Phone Number"
              value={form.phone}
              onChange={handleChange}
            />
            <input
              name="class"
              placeholder="Class"
              value={form.class}
              onChange={handleChange}
            />
            <input
              name="school"
              placeholder="School Name"
              value={form.school}
              onChange={handleChange}
            />
            <input
              name="city"
              placeholder="City"
              value={form.city}
              onChange={handleChange}
            />
            <input
              name="age"
              placeholder="Age"
              value={form.age}
              onChange={handleChange}
            />

            <select
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option value="">Status</option>
              <option value="Married">Married</option>
              <option value="Unmarried">Unmarried</option>
            </select>

            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
            >
              <option value="">Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </section>

        {/* Country + Flag in ONE select */}
        <section className="profile-country-section">
          <h2 className="profile-section-title">Select Country</h2>
          <p className="profile-country-hint">
            Choose your country from the flags list.
          </p>
          <select
            name="country"
            value={form.country}
            onChange={handleChange}
            className="country-select"
          >
            <option value="">🌍 Select Country</option>

            {/* Gulf countries priority */}
            <option value="🇦🇪 United Arab Emirates">🇦🇪 United Arab Emirates</option>
            <option value="🇸🇦 Saudi Arabia">🇸🇦 Saudi Arabia</option>
            <option value="🇶🇦 Qatar">🇶🇦 Qatar</option>
            <option value="🇰🇼 Kuwait">🇰🇼 Kuwait</option>
            <option value="🇧🇭 Bahrain">🇧🇭 Bahrain</option>
            <option value="🇴🇲 Oman">🇴🇲 Oman</option>

            {/* Some popular countries (you can extend this list as needed) */}
            <option value="🇵🇰 Pakistan">🇵🇰 Pakistan</option>
            <option value="🇮🇳 India">🇮🇳 India</option>
            <option value="🇧🇩 Bangladesh">🇧🇩 Bangladesh</option>
            <option value="🇳🇵 Nepal">🇳🇵 Nepal</option>
            <option value="🇱🇰 Sri Lanka">🇱🇰 Sri Lanka</option>
            <option value="🇺🇸 United States">🇺🇸 United States</option>
            <option value="🇬🇧 United Kingdom">🇬🇧 United Kingdom</option>
            <option value="🇨🇦 Canada">🇨🇦 Canada</option>
            <option value="🇦🇺 Australia">🇦🇺 Australia</option>
            <option value="🇳🇿 New Zealand">🇳🇿 New Zealand</option>
            <option value="🇩🇪 Germany">🇩🇪 Germany</option>
            <option value="🇫🇷 France">🇫🇷 France</option>
            <option value="🇮🇹 Italy">🇮🇹 Italy</option>
            <option value="🇪🇸 Spain">🇪🇸 Spain</option>
            <option value="🇹🇷 Türkiye">🇹🇷 Türkiye</option>
            <option value="🇪🇬 Egypt">🇪🇬 Egypt</option>
            <option value="🇲🇦 Morocco">🇲🇦 Morocco</option>
            <option value="🇳🇬 Nigeria">🇳🇬 Nigeria</option>
            <option value="🇿🇦 South Africa">🇿🇦 South Africa</option>
            <option value="🇵🇭 Philippines">🇵🇭 Philippines</option>
            <option value="🇮🇩 Indonesia">🇮🇩 Indonesia</option>
            <option value="🇲🇾 Malaysia">🇲🇾 Malaysia</option>
            <option value="🇸🇬 Singapore">🇸🇬 Singapore</option>
            <option value="🇨🇳 China">🇨🇳 China</option>
            <option value="🇯🇵 Japan">🇯🇵 Japan</option>
            <option value="🇰🇷 South Korea">🇰🇷 South Korea</option>
            <option value="🇧🇷 Brazil">🇧🇷 Brazil</option>
            <option value="🇦🇷 Argentina">🇦🇷 Argentina</option>
            <option value="🇲🇽 Mexico">🇲🇽 Mexico</option>
            <option value="🇷🇺 Russia">🇷🇺 Russia</option>
            <option value="🇺🇦 Ukraine">🇺🇦 Ukraine</option>
            <option value="🇵🇹 Portugal">🇵🇹 Portugal</option>
            <option value="🇳🇱 Netherlands">🇳🇱 Netherlands</option>
            <option value="🇧🇪 Belgium">🇧🇪 Belgium</option>
            <option value="🇨🇭 Switzerland">🇨🇭 Switzerland</option>
            <option value="🇸🇪 Sweden">🇸🇪 Sweden</option>
            <option value="🇳🇴 Norway">🇳🇴 Norway</option>
            <option value="🇩🇰 Denmark">🇩🇰 Denmark</option>
            <option value="🇫🇮 Finland">🇫🇮 Finland</option>
            <option value="🇮🇪 Ireland">🇮🇪 Ireland</option>
            <option value="🇵🇱 Poland">🇵🇱 Poland</option>
            <option value="🇨🇿 Czech Republic">🇨🇿 Czech Republic</option>
            <option value="🇦🇹 Austria">🇦🇹 Austria</option>
            <option value="🇭🇺 Hungary">🇭🇺 Hungary</option>
            <option value="🇬🇷 Greece">🇬🇷 Greece</option>
            <option value="🇷🇴 Romania">🇷🇴 Romania</option>
            <option value="🇧🇬 Bulgaria">🇧🇬 Bulgaria</option>
            <option value="🇨🇴 Colombia">🇨🇴 Colombia</option>
            <option value="🇨🇱 Chile">🇨🇱 Chile</option>
            <option value="🇵🇪 Peru">🇵🇪 Peru</option>
            {/* You can add more flags here if you want to reach 200+ */}
          </select>
        </section>

        {/* ID card uploads */}
        {/*<section className="profile-id-section">
          <h2 className="profile-section-title">ID Verification</h2>

          <div className="profile-id-grid">
            <div className="profile-id-item">
              <label>Upload ID Card Front</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setIdFront(e.target.files[0])}
              />
            </div>

            <div className="profile-id-item">
              <label>Upload ID Card Back</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setIdBack(e.target.files[0])}
              />
            </div>
          </div>
        </section>

        {/* Submit button */}
        <div className="profile-actions">
          <button
            onClick={saveProfile}
            disabled={loading}
            className="profile-save-button"
          >
            {loading ? "Saving..." : "Submit Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}