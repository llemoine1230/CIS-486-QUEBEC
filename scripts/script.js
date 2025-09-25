$(document).ready(function () {
    fetch("data/json-data.json")
    .then(response => response.json())
    .then(data => {
      let readingList = $("#readingList");
      data.forEach(entry => {
        let listItem = `<li><strong>${entry.date}:</strong> ${entry.note}</li>`;
        readingList.append(listItem); 
      });
    })
    .catch(error => {
      console.error("Error loading data.json:", error);
    });
  $("#saveReadingData").on("click", function (e) {
    e.preventDefault(); 

    const dateLog = $("#dateLog").val().trim();
    const whatRead = $("#whatRead").val().trim();
    const anyNotes = $("#anyNotes").val().trim();

    if (dateLog && whatRead) {
      const newEntry = `<li><strong>${dateLog}:</strong> ${whatRead} - <em>${anyNotes}</em></li>`;
      $("#readingList").append(newEntry); 
      $("#dateLog").val('');
      $("#whatRead").val('');
      $("#anyNotes").val('');
    } else {
      alert("Please fill in both the Date and What You Read fields.");
    }
  });
  });