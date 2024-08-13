document.addEventListener("DOMContentLoaded", () => {
	const dates = [];
	const bodyFatPercentages = [];
	const fatFreeMasses = [];
	const entries = JSON.parse(localStorage.getItem("entries")) || [];
	let editingIndex = null; // To keep track of which entry is being edited

	function updateChart() {
		const bodyFatTrace = {
			x: dates,
			y: bodyFatPercentages,
			mode: "lines+markers",
			type: "scatter",
			name: "Body Fat Percentage",
			yaxis: "y1" // Use the first y-axis
		};

		const ffmTrace = {
			x: dates,
			y: fatFreeMasses,
			mode: "lines+markers",
			type: "scatter",
			name: "Fat-Free Mass (kg)",
			yaxis: "y2" // Use the second y-axis
		};

		const layout = {
			title: "Body Fat Percentage and Fat-Free Mass Over Time",
			xaxis: {
				title: "Date"
			},
			yaxis: {
				title: "Body Fat Percentage",
				rangemode: "tozero",
				range: [10, 25] // Fixed range for body fat percentage
			},
			yaxis2: {
				title: "Fat-Free Mass (kg)",
				overlaying: "y",
				side: "right",
				rangemode: "tozero",
				range: [60, 80] // Fixed range for fat-free mass
			}
		};

		Plotly.newPlot("combined-chart", [bodyFatTrace, ffmTrace], layout);
	}

	function updateTable() {
		const tableBody = document.querySelector("#data-table tbody");
		tableBody.innerHTML = "";

		entries.forEach((entry, index) => {
			const row = document.createElement("tr");

			const date = entry.date || "";
			const weight = entry.weight ? entry.weight.toFixed(1) : "N/A";
			const waist = entry.waist ? entry.waist.toFixed(1) : "N/A";
			const neck = entry.neck ? entry.neck.toFixed(1) : "N/A";
			const bodyFatPercentage = entry.bodyFatPercentage ? entry.bodyFatPercentage.toFixed(2) : "N/A";
			const fatFreeMass = entry.fatFreeMass ? entry.fatFreeMass.toFixed(2) : "N/A";

			row.innerHTML = `
                <td>${date}</td>
                <td>${weight}</td>
                <td>${waist}</td>
                <td>${neck}</td>
                <td>${bodyFatPercentage}</td>
                <td>${fatFreeMass}</td>
                <td class="actions">
                    <button class="btn btn-warning btn-sm" onclick="editEntry(${index})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteEntry(${index})">Delete</button>
                </td>
            `;
			tableBody.appendChild(row);
		});
	}

	function saveEntries() {
		localStorage.setItem("entries", JSON.stringify(entries));
	}

	function prefillForm() {
		if (editingIndex !== null) {
			const entry = entries[editingIndex];
			document.getElementById("date").value = entry.date || "";
			document.getElementById("weight").value = entry.weight || "";
			document.getElementById("waist").value = entry.waist || "";
			document.getElementById("neck").value = entry.neck || "";
		} else {
			document.getElementById("measurement-form").reset();
		}
	}

	function downloadData() {
		const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "body_fat_tracker_data.json";
		a.click();
		URL.revokeObjectURL(url);
	}

	function sortEntries() {
		entries.sort((a, b) => new Date(a.date) - new Date(b.date));
	}

	function isDateDuplicate(date) {
		return entries.some((entry) => entry.date === date);
	}

	function handleFormSubmit(event) {
		event.preventDefault();

		// Get and parse form values
		const date = document.getElementById("date").value;
		const weightKg = parseFloat(document.getElementById("weight").value) || null;
		const waistCm = parseFloat(document.getElementById("waist").value) || null;
		const neckCm = parseFloat(document.getElementById("neck").value) || null;

		// Calculate body fat percentage and fat-free mass
		const heightCm = 188;
		const waistInches = waistCm / 2.54;
		const neckInches = neckCm / 2.54;
		const heightInches = heightCm / 2.54;
		const bodyFatPercentage =
			waistInches && neckInches
				? 86.01 * Math.log10(waistInches - neckInches) - 70.041 * Math.log10(heightInches) + 36.76
				: null;
		const fatFreeMass = weightKg && bodyFatPercentage !== null ? weightKg * (1 - bodyFatPercentage / 100) : null;

		const newEntry = { date, weight: weightKg, waist: waistCm, neck: neckCm, bodyFatPercentage, fatFreeMass };

		if (editingIndex !== null) {
			// Update existing entry
			entries[editingIndex] = newEntry;
			editingIndex = null; // Reset editingIndex after update
		} else {
			// Add new entry
			if (isDateDuplicate(date)) {
				alert("An entry with this date already exists. Please choose a different date.");
				return;
			}
			entries.push(newEntry);
		}

		sortEntries();
		saveEntries();

		// Reset arrays
		dates.length = 0;
		bodyFatPercentages.length = 0;
		fatFreeMasses.length = 0;

		// Populate arrays with updated data
		entries.forEach((entry) => {
			dates.push(entry.date);
			bodyFatPercentages.push(entry.bodyFatPercentage || 0);
			fatFreeMasses.push(entry.fatFreeMass || 0);
		});

		// Update UI
		updateChart();
		updateTable();
		prefillForm();

		// Reset the form
		document.getElementById("measurement-form").reset();
	}

	document.getElementById("measurement-form").addEventListener("submit", handleFormSubmit);

	document.getElementById("download-data").addEventListener("click", downloadData);

	window.editEntry = function (index) {
		editingIndex = index;
		prefillForm();

		// Set focus to the weight input field
		document.getElementById("weight").focus();
	};

	window.deleteEntry = function (index) {
		entries.splice(index, 1);
		sortEntries();
		saveEntries();
		updateChart();
		updateTable();
		prefillForm();
	};

	// Upload functionality
	const uploadButton = document.getElementById("upload-button");
	const fileInput = document.getElementById("upload");

	uploadButton.addEventListener("click", () => {
		const file = fileInput.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = function (event) {
				try {
					const newData = JSON.parse(event.target.result);

					if (Array.isArray(newData)) {
						// Merge data: update existing entries, add new ones
						const entryMap = new Map(entries.map((entry) => [entry.date, entry]));
						newData.forEach((newEntry) => {
							entryMap.set(newEntry.date, newEntry);
						});

						// Convert the map back to an array and sort it
						const mergedData = Array.from(entryMap.values());
						sortEntries(); // Ensure the merged data is sorted by date

						// Save the merged data to localStorage
						localStorage.setItem("entries", JSON.stringify(mergedData));

						// Update the entries array
						entries.length = 0; // Clear current entries
						entries.push(...mergedData); // Add new data

						// Reset and populate arrays
						dates.length = 0;
						bodyFatPercentages.length = 0;
						fatFreeMasses.length = 0;
						entries.forEach((entry) => {
							dates.push(entry.date);
							bodyFatPercentages.push(entry.bodyFatPercentage || 0);
							fatFreeMasses.push(entry.fatFreeMass || 0);
						});

						// Update UI
						updateChart();
						updateTable();
						prefillForm();

						alert("Data successfully uploaded and merged.");
					} else {
						alert("Uploaded file does not contain valid data.");
					}
				} catch (e) {
					alert("Error reading uploaded file.");
				}
			};
			reader.readAsText(file);
		} else {
			alert("No file selected.");
		}
	});

	// Initialize UI
	entries.forEach((entry) => {
		dates.push(entry.date);
		bodyFatPercentages.push(entry.bodyFatPercentage || 0);
		fatFreeMasses.push(entry.fatFreeMass || 0);
	});

	updateChart();
	updateTable();
	prefillForm();
});
