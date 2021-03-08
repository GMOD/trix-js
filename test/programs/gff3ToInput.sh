#!/bin/sh
echo "Formatting data for $1 with name $2"
echo 

echo "Creating genecode.$2.genePred"
../../programs/gff3ToGenePred -geneNameAttr=gene_name $1 stdout | sort -k2,2 -k4n,4n > gencode.$2.genePred
echo "Creating input.$2.txt"
cat gencode.$2.genePred | awk '{print $1, $12, $1}' > input.$2.txt
echo "Creating genecode.$2.bed"
../../programs/genePredToBed gencode.$2.genePred gencode.$2.bed

echo
echo "Done"
