import React from "react";

export default function JoinExam() {
  const handleJoin = () => {
    fetch("https://us-central1-xacademy8-e52db.cloudfunctions.net/joinExamHttp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        studentId: "student_001",
        groupType: "medical"
      })
    })
      .then(res => res.json())
      .then(data => {
        console.log("Response:", data);
        alert("Room assigned: " + data.data.roomId);
      })
      .catch(err => {
        console.error("Error:", err);
        alert("Join failed");
      });
  };

  return (
    <div>
      <h2>Join Exam</h2>
      <button onClick={handleJoin}>Join Now</button>
    </div>
  );
}
