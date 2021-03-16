

// This function demos how to use the binary parser.
// https://github.com/keichi/binary-parser
export const demoParse = () => {

  // Module import
  var Parser = require("@gmod/binary-parser").Parser;

  // Build an IP packet header Parser
  var ipHeader = new Parser()
    // .endianess("big") // From Hex Below > To Decimal Result:
    .bit4("version")        // 4      --> 4
    .bit4("headerLength")   // 5      --> 5
    .uint8("tos")           // 00     --> 0
    .uint16("packetLength") // 02C5   --> 709
    .uint16("id")           // 9399   --> 37785
    .bit3("offset")         // 0      --> 0
    .bit13("fragOffset")    // 0      --> 0
    .uint8("ttl")           // 2c     --> 44
    .uint8("protocol")      // 06     --> 6
    .uint16("checksum")     // EF98   --> 61336
    .array("src", {         // adc24f6c -> [173, 194, 79, 108]
      type: "uint8",
      length: 4
    })
    .array("dst", {         // 850186d1 -> [133, 1, 134, 209]
      type: "uint8",
      length: 4
    });

  // Prepare buffer to parse.
  // Big Endian:
  // var buf = Buffer.from("450002c5939900002c06ef98adc24f6c850186d1", "hex");
  // var buf = Buffer.from("4500 02c5 9399 0000 2c06 ef98 adc2 4f6c 8501 86d1", "hex");

  // Little Endian Equivalent (bytes in each word swapped):
  // var buf = Buffer.from("0045 c502 9993 0000 062c 98ef c2ad 6c4f 0185 d186", "hex");
  var buf = Buffer.from("0045c50299930000062c98efc2ad6c4f0185d186", "hex");

  // Parse buffer and show result
  console.log(ipHeader.parse(buf));

  return 1;
};