// src/services/examService.js
export async function joinExamRoom(payload) {
  const res = await fetch(
    "https://xacademy-functions.web.app/joinExamRoom",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();
  return { roomId: data.roomId };
}
