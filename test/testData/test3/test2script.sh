#!/bin/sh
echo "Runnning test3"
echo 

while read term
do
	echo "Search: $term "
	../../programs/trixSearch out $term
	echo
done < searchTerms.txt

echo
echo "Done"
