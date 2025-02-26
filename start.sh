#!/bin/bash
# Start the Timetastic Weekly Report scheduler
echo "Starting Timetastic Weekly Report scheduler..."
nohup node weekly-reports.js > timetastic-report.log 2>&1 &
echo "Scheduler started in the background. Process ID: $!"
echo "You can check the logs with: tail -f timetastic-report.log" 