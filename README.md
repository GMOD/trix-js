# trix-js
Read UCSC Trix indexes in pure JavaScript

### Test trix-js
First, clone this repo.
Install npm packages.
Run `npm test`. 

#### Test the USCS TrixSearch - Requires Linux
First, clone this repo.
To run test searches on a track hub using the USCS `TrixSearch`, navigate to `tests/testdata/test#` and run `bash test#script.sh` where # is the test number.
To change search terms, edit `searchterms.txt`.

**Wondering what to search for?**<br>
Open up `tests/testdata/test#/input.txt`.


**How to test my own .gff.gz data?**<br>
Navigate to `/test/rawGenomes` and create a directory with your .gff.gz file in it. From within that directory, run `bash ../../programs/gff3ToInput.sh <.gff3.gz FILE> <OUTPUT NAME>`.

