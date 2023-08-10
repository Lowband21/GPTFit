#!/bin/bash

# Path to your directory
DIR_PATH="./"

# Find all .py files in the specified directory (not recursively), concatenate them and copy to clipboard
find "$DIR_PATH" -maxdepth 1 -name "*.rs" -print0 | xargs -0 cat | wl-copy
