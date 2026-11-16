export const glossary = [
  {
    term: 'ACK',
    category: 'Transport',
    definition:
      'An acknowledgment. In TCP, its number usually identifies the next byte the receiver expects.',
  },
  {
    term: 'Certificate',
    category: 'Security',
    definition:
      'A signed document binding a public key to an identity. TLS clients validate its trust chain, validity, and hostname.',
  },
  {
    term: 'Datagram',
    category: 'Transport',
    definition:
      'An independent message sent through a packet network. UDP preserves datagram boundaries.',
  },
  {
    term: 'Default gateway',
    category: 'Network',
    definition: 'The router a host uses when no more specific route matches the destination.',
  },
  {
    term: 'DNS record',
    category: 'Application',
    definition:
      'A typed entry in DNS. A and AAAA provide addresses; MX identifies mail exchangers.',
  },
  {
    term: 'Encapsulation',
    category: 'Network',
    definition:
      'Wrapping higher-layer data inside a lower-layer message, such as HTTP in TCP, TCP in IP, and IP in Ethernet.',
  },
  {
    term: 'Frame',
    category: 'Network',
    definition:
      'A link-layer message, such as an Ethernet or Wi-Fi frame, that carries data across a local link.',
  },
  {
    term: 'Handshake',
    category: 'Transport',
    definition:
      'An exchange that establishes connection state or negotiates parameters before normal communication.',
  },
  {
    term: 'IP address',
    category: 'Network',
    definition:
      'A network-layer address used for routing. IPv4 uses 32 bits and IPv6 uses 128 bits.',
  },
  {
    term: 'Latency',
    category: 'Network',
    definition:
      'Time taken for data to travel. Round-trip time measures a request’s journey to the peer and a response back.',
  },
  {
    term: 'MAC address',
    category: 'Network',
    definition:
      'A link-layer identifier used to deliver frames on a local network. An Ethernet MAC address is 48 bits.',
  },
  {
    term: 'MTU',
    category: 'Network',
    definition:
      'Maximum transmission unit: the largest network-layer packet a link can carry without fragmentation.',
  },
  {
    term: 'Multiplexing',
    category: 'Transport',
    definition: 'Carrying several logical conversations over shared transport or infrastructure.',
  },
  {
    term: 'NAT',
    category: 'Network',
    definition:
      'Network Address Translation rewrites addresses, and often ports, while tracking mappings between networks.',
  },
  {
    term: 'Packet',
    category: 'Network',
    definition:
      'A unit of network data. The term is often used loosely for frames, IP packets, or transport segments.',
  },
  {
    term: 'Port',
    category: 'Transport',
    definition:
      'A 16-bit number used by TCP or UDP to identify a service or conversation at an endpoint.',
  },
  {
    term: 'Retransmission',
    category: 'Transport',
    definition:
      'Sending data again when delivery appears to have failed. TCP and QUIC implement loss recovery.',
  },
  {
    term: 'Routing',
    category: 'Network',
    definition:
      'Selecting a next hop toward a destination using a routing table and address prefixes.',
  },
  {
    term: 'Segment',
    category: 'Transport',
    definition:
      'A TCP message containing a header and, optionally, part of the application’s byte stream.',
  },
  {
    term: 'Sequence number',
    category: 'Transport',
    definition:
      'A position in an ordered stream. TCP counts bytes; other protocols may number messages or packets.',
  },
  {
    term: 'SNI',
    category: 'Security',
    definition:
      'Server Name Indication tells a TLS server which hostname the client wants. Without ECH it can be visible in ClientHello.',
  },
  {
    term: 'Subnet',
    category: 'Network',
    definition:
      'An address range defined by a prefix. Hosts use it, along with routing rules, to decide what is local.',
  },
  {
    term: 'TLS',
    category: 'Security',
    definition:
      'A protocol providing encryption, integrity, and endpoint authentication for application connections.',
  },
  {
    term: 'TTL',
    category: 'Network',
    definition:
      'In IPv4, a lifetime field decreased by routers. In DNS, the maximum lifetime of a cached resource record. These are separate uses.',
  },
];
