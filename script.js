// script.js
document.addEventListener('DOMContentLoaded', () => {
    const dates = [];
    const bodyFatPercentages = [];
    const fatFreeMasses = [];
    const entries = JSON.parse(localStorage.getItem('entries')) || [];

    function updateChart() {
        const bodyFatTrace = {
            x: dates,
            y: bodyFatPercentages,
            mode: 'lines+markers',
            type: 'scatter',
            name: 'Body Fat Percentage',
            yaxis: 'y1' // Use the first y-axis
        };

        const ffmTrace = {
            x: dates,
            y: fatFreeMasses,
            mode: 'lines+markers',
            type: 'scatter',
            name: 'Fat-Free Mass (kg)',
            yaxis: 'y2' // Use the second y-axis
        };

        const layout = {
            title: 'Body Fat Percentage and Fat-Free Mass Over Time',
            xaxis: {
                title: 'Date'
            },
            yaxis: {
                title: 'Body Fat Percentage',
                rangemode: 'tozero',
                range: [10, 25] // Fixed range for body fat percentage
            },
            yaxis2: {
                title: 'Fat-Free Mass (kg)',
                overlaying: 'y',
                side: 'right',
                rangemode: 'tozero',
                range: [60, 80] // Fixed range for fat-free mass
            }
        };

        Plotly.newPlot('combined-chart', [bodyFatTrace, ffmTrace], layout);
    }

    function updateTable() {
        const tableBody = document.querySelector('#data-table tbody');
        tableBody.innerHTML = '';

        entries.forEach((entry, index) => {
            const row = document.createElement('tr');
            
            const date = entry.date || '';
            const weight = entry.weight ? entry.weight.toFixed(1) : 'N/A';
            const waist = entry.waist ? entry.waist.toFixed(1) : 'N/A';
            const neck = entry.neck ? entry.neck.toFixed(1) : 'N/A';
            const bodyFatPercentage = entry.bodyFatPercentage ? entry.bodyFatPercentage.toFixed(2) : 'N/A';
            const fatFreeMass = entry.fatFreeMass ? entry.fatFreeMass.toFixed(2) : 'N/A';

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
        localStorage.setItem('entries', JSON.stringify(entries));
    }

    function prefillForm() {
        const latestEntry = entries[entries.length - 1];
        if (latestEntry) {
            document.getElementById('date').value = latestEntry.date || '';
            document.getElementById('weight').value = latestEntry.weight || '';
            document.getElementById('waist').value = latestEntry.waist || '';
            document.getElementById('neck').value = latestEntry.neck || '';
        }
    }

    function downloadData() {
        const csvRows = [];
        const headers = ['Date', 'Weight (kg)', 'Waist (cm)', 'Neck (cm)', 'Body Fat %', 'Fat-Free Mass (kg)'];
        csvRows.push(headers.join(','));

        entries.forEach(entry => {
            const date = entry.date || '';
            const weight = entry.weight ? entry.weight.toFixed(1) : '';
            const waist = entry.waist ? entry.waist.toFixed(1) : '';
            const neck = entry.neck ? entry.neck.toFixed(1) : '';
            const bodyFatPercentage = entry.bodyFatPercentage ? entry.bodyFatPercentage.toFixed(2) : '';
            const fatFreeMass = entry.fatFreeMass ? entry.fatFreeMass.toFixed(2) : '';

            csvRows.push([date, weight, waist, neck, bodyFatPercentage, fatFreeMass].join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'body_fat_tracker_data.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    function sortEntries() {
        entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    function isDateDuplicate(date) {
        return entries.some(entry => entry.date === date);
    }

    function handleFormSubmit(event) {
        event.preventDefault();

        const date = document.getElementById('date').value;
        const weight = parseFloat(document.getElementById('weight').value) || null;
        const waist = parseFloat(document.getElementById('waist').value) || null;
        const neck = parseFloat(document.getElementById('neck').value) || null;

        if (isDateDuplicate(date)) {
            alert('An entry with this date already exists. Please choose a different date.');
            return;
        }

        const height = 188;
        const bodyFatPercentage = waist && neck ? 
            86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76 
            : null;

        const fatFreeMass = weight && bodyFatPercentage !== null ?
            weight * (1 - (bodyFatPercentage / 100))
            : null;

        const newEntry = { date, weight, waist, neck, bodyFatPercentage, fatFreeMass };
        entries.push(newEntry);
        sortEntries();
        saveEntries();

        dates.length = 0;
        bodyFatPercentages.length = 0;
        fatFreeMasses.length = 0;

        entries.forEach(entry => {
            dates.push(entry.date);
            bodyFatPercentages.push(entry.bodyFatPercentage || 0);
            fatFreeMasses.push(entry.fatFreeMass || 0);
        });

        updateChart();
        updateTable();
        prefillForm();

        document.getElementById('measurement-form').reset();
    }

    document.getElementById('measurement-form').addEventListener('submit', handleFormSubmit);

    document.getElementById('download-data').addEventListener('click', downloadData);

    window.editEntry = function(index) {
        const entry = entries[index];
        document.getElementById('date').value = entry.date || '';
        document.getElementById('weight').value = entry.weight || '';
        document.getElementById('waist').value = entry.waist || '';
        document.getElementById('neck').value = entry.neck || '';

        entries.splice(index, 1);
        sortEntries();
        saveEntries();
        updateChart();
        updateTable();
        prefillForm();
    }

    window.deleteEntry = function(index) {
        entries.splice(index, 1);
        sortEntries();
        saveEntries();
        updateChart();
        updateTable();
        prefillForm();
    }

    entries.forEach(entry => {
        dates.push(entry.date);
        bodyFatPercentages.push(entry.bodyFatPercentage || 0);
        fatFreeMasses.push(entry.fatFreeMass || 0);
    });

    updateChart();
    updateTable();
    prefillForm();
});
