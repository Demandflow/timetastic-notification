#!/bin/bash
# Stop the Timetastic Weekly Report scheduler
echo "Stopping Timetastic Weekly Report scheduler..."
PID=$(ps aux | grep "node weekly-reports.js" | grep -v grep | awk '{print $2}')
if [ -z "$PID" ]; then
  echo "No running scheduler process found."
else
  echo "Stopping process ID: $PID"
  kill $PID
  echo "Scheduler stopped."
fi 