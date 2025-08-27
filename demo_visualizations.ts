#!/usr/bin/env node

// Data Visualization Demonstration Script
// This script shows how to generate visualizations from political data

console.log("=========================================");
console.log("OpenDiscourse Data Visualization Demo");
console.log("=========================================\n");

// Mock visualization functions
async function generateTimelineData() {
  console.log("Generating timeline data...");
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Simulated timeline data
  return {
    title: "Legislative Activity Timeline - Data Privacy Bills (2023-2025)",
    data: [
      { date: "2023-01-15", event: "Introduction of HR 123 - Digital Privacy Act", type: "bill_introduced", count: 1 },
      { date: "2023-03-22", event: "Committee Hearings Begin", type: "hearing", count: 3 },
      { date: "2023-06-10", event: "Mark-up Session Completed", type: "markup", count: 1 },
      { date: "2023-09-05", event: "Bill Reported to Floor", type: "reported", count: 1 },
      { date: "2024-02-18", event: "Floor Debate Begins", type: "debate", count: 1 },
      { date: "2024-05-30", event: "Vote Scheduled", type: "vote", count: 1 },
      { date: "2024-08-12", event: "Introduction of S 456 - Federal Privacy Protection Act", type: "bill_introduced", count: 1 },
      { date: "2024-11-25", event: "Senate Committee Hearings", type: "hearing", count: 2 },
      { date: "2025-01-30", event: "Introduction of HR 1234 - American Data Privacy Act", type: "bill_introduced", count: 1 },
      { date: "2025-03-15", event: "Committee Hearings Begin", type: "hearing", count: 4 },
      { date: "2025-04-02", event: "Bill Reported from Committee", type: "reported", count: 1 },
      { date: "2025-06-15", event: "Anticipated Floor Consideration", type: "scheduled", count: 1 }
    ]
  };
}

async function generateNetworkData() {
  console.log("Generating network visualization data...");
  await new Promise(resolve => setTimeout(resolve, 700));
  
  // Simulated network data
  return {
    title: "Congressional Network - Privacy Legislation Sponsors and Cosponsors",
    nodes: [
      { id: "smith_jane", label: "Rep. Jane Smith (D-CA)", type: "sponsor", size: 30, color: "#FF6B6B" },
      { id: "johnson_alex", label: "Rep. Alex Johnson (D-CA)", type: "cosponsor", size: 20, color: "#4ECDC4" },
      { id: "williams_sarah", label: "Rep. Sarah Williams (R-TX)", type: "cosponsor", size: 20, color: "#4ECDC4" },
      { id: "doe_john", label: "Sen. John Doe (R-TX)", type: "sponsor", size: 30, color: "#FF6B6B" },
      { id: "brown_mike", label: "Rep. Mike Brown (D-NY)", type: "cosponsor", size: 20, color: "#4ECDC4" },
      { id: "davis_lisa", label: "Sen. Lisa Davis (D-IL)", type: "cosponsor", size: 20, color: "#4ECDC4" },
      { id: "wilson_robert", label: "Rep. Robert Wilson (R-FL)", type: "cosponsor", size: 20, color: "#4ECDC4" },
      { id: "energy_commerce", label: "Energy and Commerce Committee", type: "committee", size: 25, color: "#1A535C" },
      { id: "judiciary", label: "Judiciary Committee", type: "committee", size: 25, color: "#1A535C" },
      { id: "financial_services", label: "Financial Services Committee", type: "committee", size: 25, color: "#1A535C" }
    ],
    edges: [
      { from: "smith_jane", to: "energy_commerce", type: "assigned_to", label: "Assigned" },
      { from: "smith_jane", to: "judiciary", type: "assigned_to", label: "Assigned" },
      { from: "smith_jane", to: "johnson_alex", type: "cosponsored_by", label: "Cosponsored" },
      { from: "smith_jane", to: "williams_sarah", type: "cosponsored_by", label: "Cosponsored" },
      { from: "smith_jane", to: "brown_mike", type: "cosponsored_by", label: "Cosponsored" },
      { from: "doe_john", to: "financial_services", type: "assigned_to", label: "Assigned" },
      { from: "doe_john", to: "davis_lisa", type: "cosponsored_by", label: "Cosponsored" },
      { from: "doe_john", to: "wilson_robert", type: "cosponsored_by", label: "Cosponsored" },
      { from: "energy_commerce", to: "judiciary", type: "collaborates_with", label: "Collaborates" },
      { from: "judiciary", to: "financial_services", type: "collaborates_with", label: "Collaborates" }
    ]
  };
}

async function generateBarChartData() {
  console.log("Generating bar chart data...");
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Simulated bar chart data
  return {
    title: "Bill Topics Distribution in 118th Congress",
    data: [
      { topic: "Healthcare", count: 42, percentage: 18.5 },
      { topic: "Economy", count: 38, percentage: 16.7 },
      { topic: "Education", count: 31, percentage: 13.6 },
      { topic: "Infrastructure", count: 29, percentage: 12.7 },
      { topic: "Privacy/Data Protection", count: 27, percentage: 11.9 },
      { topic: "Defense", count: 22, percentage: 9.7 },
      { topic: "Environment", count: 19, percentage: 8.3 },
      { topic: "Immigration", count: 12, percentage: 5.3 },
      { topic: "Other", count: 7, percentage: 3.1 }
    ]
  };
}

async function generatePieChartData() {
  console.log("Generating pie chart data...");
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Simulated pie chart data
  return {
    title: "Party Affiliation of Privacy Bill Cosponsors",
    data: [
      { party: "Democratic", count: 68, percentage: 61.8 },
      { party: "Republican", count: 35, percentage: 31.8 },
      { party: "Independent", count: 7, percentage: 6.4 }
    ]
  };
}

async function generateHeatmapData() {
  console.log("Generating heatmap data...");
  await new Promise(resolve => setTimeout(resolve, 400));
  
  // Simulated heatmap data
  return {
    title: "Legislative Activity by Month and Committee (2023-2025)",
    xAxis: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    yAxis: ["Energy & Commerce", "Judiciary", "Financial Services", "Ways & Means", "Oversight", "Armed Services", "Foreign Affairs"],
    data: [
      [12, 8, 15, 7, 10, 5, 9, 11, 6, 8, 13, 7],  // Energy & Commerce
      [9, 6, 12, 8, 11, 7, 5, 10, 9, 6, 11, 8],   // Judiciary
      [7, 10, 8, 12, 9, 11, 6, 8, 10, 7, 9, 12],  // Financial Services
      [5, 7, 6, 9, 8, 10, 8, 6, 7, 9, 5, 8],      // Ways & Means
      [8, 5, 9, 6, 7, 8, 10, 7, 8, 6, 7, 9],      // Oversight
      [6, 8, 7, 5, 9, 6, 8, 9, 5, 7, 8, 6],       // Armed Services
      [4, 6, 5, 7, 6, 8, 5, 6, 7, 5, 6, 7]        // Foreign Affairs
    ]
  };
}

async function generateVisualizations() {
  try {
    console.log("--- Generating Data Visualizations ---\n");
    
    // Generate timeline visualization
    const timelineData = await generateTimelineData();
    console.log(`1. ${timelineData.title}`);
    console.log("   Visualization type: Interactive timeline");
    console.log("   Data points:", timelineData.data.length);
    console.log("   Time range:", timelineData.data[0].date, "to", timelineData.data[timelineData.data.length - 1].date);
    console.log("   Output: timeline_chart.html\n");
    
    // Generate network visualization
    const networkData = await generateNetworkData();
    console.log(`2. ${networkData.title}`);
    console.log("   Visualization type: Network graph");
    console.log("   Nodes:", networkData.nodes.length);
    console.log("   Edges:", networkData.edges.length);
    console.log("   Output: network_graph.html\n");
    
    // Generate bar chart
    const barChartData = await generateBarChartData();
    console.log(`3. ${barChartData.title}`);
    console.log("   Visualization type: Bar chart");
    console.log("   Categories:", barChartData.data.length);
    console.log("   Top topic:", barChartData.data[0].topic, `(${barChartData.data[0].percentage}%)`);
    console.log("   Output: topics_bar_chart.png\n");
    
    // Generate pie chart
    const pieChartData = await generatePieChartData();
    console.log(`4. ${pieChartData.title}`);
    console.log("   Visualization type: Pie chart");
    console.log("   Segments:", pieChartData.data.length);
    console.log("   Majority party:", pieChartData.data[0].party, `(${pieChartData.data[0].percentage}%)`);
    console.log("   Output: party_affiliation_pie_chart.png\n");
    
    // Generate heatmap
    const heatmapData = await generateHeatmapData();
    console.log(`5. ${heatmapData.title}`);
    console.log("   Visualization type: Heatmap");
    console.log("   Time periods:", heatmapData.xAxis.length);
    console.log("   Committees:", heatmapData.yAxis.length);
    console.log("   Data points:", heatmapData.xAxis.length * heatmapData.yAxis.length);
    console.log("   Output: activity_heatmap.png\n");
    
    console.log("--- Visualization Generation Complete ---");
    console.log("All visualizations have been successfully generated.");
    console.log("Files saved to the /visualizations/ directory.");
    console.log("You can view them by opening the HTML files in a web browser.");
    
  } catch (error) {
    console.error("Error during visualization generation:", error);
    process.exit(1);
  }
}

// Run the visualization demo
generateVisualizations();
