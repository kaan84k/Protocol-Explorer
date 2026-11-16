export type Category = 'Web' | 'Transport' | 'Network' | 'Security' | 'Application';
export type NodeKind = 'client' | 'router' | 'server' | 'dns' | 'wifi' | 'switch';
export interface Device {
  id: string;
  label: string;
  address: string;
  kind: NodeKind;
  x: number;
  y: number;
}
export interface Packet {
  from: string;
  to: string;
  protocol: string;
  label: string;
  summary: string;
  bytes: number;
  port?: number;
  flags?: string;
  payload?: string;
  encrypted?: boolean;
  lost?: boolean;
}
export interface Step {
  title: string;
  description: string;
  insight: string;
  packets: Packet[];
}
export interface Protocol {
  id: string;
  name: string;
  fullName: string;
  category: Category;
  layer: number;
  port: string;
  tagline: string;
  description: string;
  takeaway: string;
  color: string;
  rfc: string;
  devices: Device[];
  steps: Step[];
  quiz: { question: string; options: string[]; answer: number; explanation: string };
}
const device = (
  id: string,
  label: string,
  address: string,
  kind: NodeKind,
  x: number,
  y: number,
): Device => ({ id, label, address, kind, x, y });
const client = device('client', 'Your device', '192.168.1.10', 'client', 105, 190);
const router = device('router', 'Home router', '192.168.1.1', 'router', 390, 190);
const server = device('server', 'Web server', '203.0.113.10', 'server', 675, 190);
const dns = device('dns', 'DNS resolver', '192.0.2.53', 'dns', 390, 55);
const network = [client, router, server];
const web = [client, router, server, dns];
const p = (
  from: string,
  to: string,
  protocol: string,
  label: string,
  summary: string,
  extra: Partial<Packet> = {},
): Packet => ({ from, to, protocol, label, summary, bytes: 74, ...extra });
const s = (title: string, description: string, insight: string, packets: Packet[] = []): Step => ({
  title,
  description,
  insight,
  packets,
});
const handshake = (port: number) => [
  p('client', 'server', 'TCP', 'SYN', 'The client asks to open a connection.', {
    port,
    flags: 'SYN',
    payload: 'Seq=0 • Window=64240 • MSS=1460',
  }),
  p('server', 'client', 'TCP', 'SYN, ACK', 'The server accepts and acknowledges the client.', {
    port,
    flags: 'SYN, ACK',
    payload: 'Seq=0 • Ack=1 • Window=65535',
  }),
  p('client', 'server', 'TCP', 'ACK', 'The client confirms. Both ends are ready.', {
    port,
    flags: 'ACK',
    bytes: 54,
    payload: 'Seq=1 • Ack=1',
  }),
];
const lookup = () => [
  p('client', 'dns', 'DNS', 'A? example.com', 'Look up an IPv4 address for example.com.', {
    port: 53,
    bytes: 71,
    payload: 'Query ID: 0x4a2c\nType: A (IPv4)\nName: example.com\nRecursion desired: yes',
  }),
  p('dns', 'client', 'DNS', '203.0.113.10', 'The resolver returns the cached address.', {
    port: 53,
    bytes: 87,
    payload: 'Response: NOERROR\nexample.com  300  IN  A  203.0.113.10',
  }),
];
const quiz = (question: string, options: string[], answer: number, explanation: string) => ({
  question,
  options,
  answer,
  explanation,
});
export const protocols: Protocol[] = [
  {
    id: 'http',
    name: 'HTTP',
    fullName: 'Hypertext Transfer Protocol',
    category: 'Web',
    layer: 7,
    port: '80',
    color: 'mint',
    rfc: '9110',
    tagline: 'The conversation behind every web page.',
    description:
      'A browser asks for a resource. A server sends a response. Follow a simple HTTP/1.1 request from the first address lookup to the page arriving on your screen.',
    takeaway:
      'HTTP defines the messages. TCP delivers their bytes. Plain HTTP does not encrypt either one.',
    devices: web,
    steps: [
      s(
        'Resolve the address',
        'You enter http://example.com. Your browser needs an IP address, so it asks a DNS resolver. Here, the resolver already has the answer cached.',
        'DNS translates a name into an address; it does not fetch the website.',
        lookup(),
      ),
      s(
        'Open a connection',
        'The client and server perform a TCP three-way handshake on port 80. They agree on starting sequence numbers before sending the request.',
        'SYN → SYN-ACK → ACK establishes a reliable, ordered byte stream.',
        handshake(80),
      ),
      s(
        'Send the request',
        'The browser sends a GET request for the home page. HTTP/1.1 headers describe what it wants and which host it is trying to reach.',
        'The Host header lets a server host several websites on the same IP address.',
        [
          p('client', 'server', 'HTTP', 'GET / HTTP/1.1', 'Request the home page.', {
            port: 80,
            bytes: 186,
            payload: 'GET / HTTP/1.1\nHost: example.com\nAccept: text/html\nConnection: keep-alive',
          }),
        ],
      ),
      s(
        'Receive the response',
        'The server sends 200 OK, response headers, and HTML. A large response would be split across multiple TCP segments; this lesson shows it as one message.',
        'A status code describes the result: 2xx success, 4xx client error, 5xx server error.',
        [
          p('server', 'client', 'HTTP', '200 OK', 'Return the HTML document.', {
            port: 80,
            bytes: 824,
            payload:
              'HTTP/1.1 200 OK\nContent-Type: text/html; charset=utf-8\nConnection: keep-alive\n\n<!doctype html>\n<html><body>Hello, internet.</body></html>',
          }),
        ],
      ),
      s(
        'Render the page',
        'The browser parses the HTML and renders the page. Images, scripts, and stylesheets may trigger additional requests over reusable connections.',
        'The network delivers bytes; the browser turns those bytes into a page.',
      ),
    ],
    quiz: quiz(
      'What does HTTP itself define?',
      [
        'How routers choose the next hop',
        'The format and meaning of requests and responses',
        'How lost TCP segments are retransmitted',
      ],
      1,
      'HTTP defines application messages. Routing belongs to IP, and reliable delivery belongs to TCP.',
    ),
  },
  {
    id: 'https',
    name: 'HTTPS',
    fullName: 'HTTP over Transport Layer Security',
    category: 'Web',
    layer: 7,
    port: '443',
    color: 'mint',
    rfc: '9110',
    tagline: 'The web, with a private connection.',
    description:
      'Add authentication and encryption to the browser–server conversation. This lesson follows HTTP/1.1 over TCP with a TLS 1.3 handshake.',
    takeaway:
      'HTTPS protects HTTP content in transit. IP addresses and traffic sizes are still visible.',
    devices: web,
    steps: [
      s(
        'Find the server',
        'The browser resolves example.com to an IP address. This lesson uses ordinary DNS; encrypted DNS is a separate option.',
        'HTTPS does not automatically encrypt a traditional DNS lookup.',
        lookup(),
      ),
      s(
        'Connect on port 443',
        'A TCP handshake opens a connection to the HTTPS service. At this stage, no application data is encrypted.',
        'The port identifies the service, while the IP address identifies the host.',
        handshake(443),
      ),
      s(
        'Negotiate TLS',
        'The client sends a ClientHello. The server chooses cryptographic parameters and provides its key share. The client validates the server certificate.',
        'In TLS 1.3, handshake messages after ServerHello are encrypted.',
        [
          p(
            'client',
            'server',
            'TLS',
            'ClientHello',
            'Offer TLS versions, key shares, and application protocols.',
            {
              port: 443,
              bytes: 517,
              payload:
                'Versions: TLS 1.3\nServer name: example.com\nKey share: X25519\nALPN: http/1.1',
            },
          ),
          p(
            'server',
            'client',
            'TLS',
            'ServerHello + handshake',
            'Select keys, prove server identity, and send Finished.',
            {
              port: 443,
              bytes: 1480,
              encrypted: true,
              payload:
                'ServerHello (clear)\nEncryptedExtensions, Certificate, CertificateVerify, Finished (encrypted)',
            },
          ),
          p('client', 'server', 'TLS', 'Finished', 'Confirm the handshake transcript.', {
            port: 443,
            bytes: 94,
            encrypted: true,
          }),
        ],
      ),
      s(
        'Exchange encrypted HTTP',
        'The HTTP request and response travel inside encrypted TLS records. Only the endpoints can read the application content.',
        'TLS provides confidentiality and integrity, and verifies the server’s identity.',
        [
          p(
            'client',
            'server',
            'HTTPS',
            'Encrypted request',
            'TLS application data containing GET /.',
            {
              port: 443,
              bytes: 230,
              encrypted: true,
              payload: 'Decrypted at the endpoint:\nGET / HTTP/1.1\nHost: example.com',
            },
          ),
          p(
            'server',
            'client',
            'HTTPS',
            'Encrypted response',
            'TLS application data containing 200 OK and HTML.',
            {
              port: 443,
              bytes: 868,
              encrypted: true,
              payload: 'Decrypted at the endpoint:\nHTTP/1.1 200 OK\nContent-Type: text/html',
            },
          ),
        ],
      ),
      s(
        'Display the page',
        'The browser decrypts the content and renders it. The connection is authenticated, but that does not guarantee the website itself is trustworthy.',
        'Encryption protects transport; it does not judge a website’s content.',
      ),
    ],
    quiz: quiz(
      'What can an observer still see with HTTPS?',
      ['The exact HTTP response body', 'Your form fields', 'IP addresses and packet sizes'],
      2,
      'TLS encrypts the HTTP messages, but routing information and traffic sizes remain observable.',
    ),
  },
  {
    id: 'websocket',
    name: 'WebSocket',
    fullName: 'Full-duplex web communication',
    category: 'Web',
    layer: 7,
    port: '80 / 443',
    color: 'mint',
    rfc: '6455',
    tagline: 'One connection. A conversation in both directions.',
    description:
      'See how an HTTP/1.1 connection upgrades into a persistent WebSocket, allowing either endpoint to send messages whenever it needs to.',
    takeaway:
      'WebSocket adds message framing and two-way communication on a persistent connection.',
    devices: network,
    steps: [
      s(
        'Open TCP',
        'The browser connects to the server. This example uses plain ws://; secure wss:// adds TLS first.',
        'WebSocket uses TCP’s reliable delivery.',
        handshake(80),
      ),
      s(
        'Request an upgrade',
        'The browser sends an HTTP request with Upgrade: websocket and a randomly generated key.',
        'The handshake begins as HTTP/1.1, but the message format changes after acceptance.',
        [
          p('client', 'server', 'HTTP', 'Upgrade: websocket', 'Request a protocol upgrade.', {
            port: 80,
            bytes: 290,
            payload:
              'GET /chat HTTP/1.1\nHost: example.com\nConnection: Upgrade\nUpgrade: websocket\nSec-WebSocket-Version: 13\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==',
          }),
        ],
      ),
      s(
        'Switch protocols',
        'The server answers 101 Switching Protocols and computes an acceptance value from the client key.',
        'The acceptance value confirms the handshake, not the user’s identity.',
        [
          p(
            'server',
            'client',
            'HTTP',
            '101 Switching Protocols',
            'Accept the WebSocket upgrade.',
            {
              port: 80,
              bytes: 210,
              payload:
                'HTTP/1.1 101 Switching Protocols\nUpgrade: websocket\nConnection: Upgrade\nSec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=',
            },
          ),
        ],
      ),
      s(
        'Exchange messages',
        'Both sides send WebSocket frames independently. Client frames are masked; masking is not encryption.',
        'The server can push a new message without waiting for another HTTP request.',
        [
          p('client', 'server', 'WebSocket', 'Hello!', 'A masked client text frame.', {
            port: 80,
            bytes: 66,
            payload: 'FIN=1 • Opcode=1 • MASK=1\nText: Hello!',
          }),
          p('server', 'client', 'WebSocket', 'New message', 'An unmasked server text frame.', {
            port: 80,
            bytes: 86,
            payload: 'FIN=1 • Opcode=1 • MASK=0\nText: Welcome to the conversation.',
          }),
        ],
      ),
    ],
    quiz: quiz(
      'Does WebSocket client masking provide encryption?',
      ['Yes', 'No', 'Only on port 80'],
      1,
      'Masking is a protocol safeguard. Use wss:// and TLS to encrypt the connection.',
    ),
  },
  {
    id: 'tcp',
    name: 'TCP',
    fullName: 'Transmission Control Protocol',
    category: 'Transport',
    layer: 4,
    port: 'Varies',
    color: 'blue',
    rfc: '9293',
    tagline: 'Every byte. In the right order.',
    description:
      'Explore connection setup, sequence numbers, acknowledgments, and recovery when a packet goes missing.',
    takeaway: 'TCP provides an ordered byte stream. Applications do not see packet boundaries.',
    devices: network,
    steps: [
      s(
        'Shake hands',
        'The client and server exchange SYN, SYN-ACK, and ACK. Relative sequence numbers make the example easier to follow.',
        'Each side has its own sequence number space.',
        handshake(80),
      ),
      s(
        'Send numbered bytes',
        'The client sends two 1,000-byte segments. The first is lost in transit, while the second arrives.',
        'Sequence numbers identify byte positions, not packet numbers.',
        [
          p('client', 'server', 'TCP', 'Seq=1 · 1,000 B', 'Bytes 1–1000 are lost on the way.', {
            port: 80,
            bytes: 1054,
            flags: 'ACK',
            lost: true,
            payload: 'Seq=1 • Ack=1 • Len=1000',
          }),
          p(
            'client',
            'server',
            'TCP',
            'Seq=1001 · 1,000 B',
            'Bytes 1001–2000 arrive out of order.',
            { port: 80, bytes: 1054, flags: 'ACK', payload: 'Seq=1001 • Ack=1 • Len=1000' },
          ),
        ],
      ),
      s(
        'Report the gap',
        'The receiver still acknowledges byte 1 as the next expected byte. A SACK block reports the later bytes it already has.',
        'A single duplicate ACK alone does not trigger classic fast retransmit.',
        [
          p('server', 'client', 'TCP', 'ACK=1 · SACK', 'Report the received range 1001–2000.', {
            port: 80,
            bytes: 66,
            flags: 'ACK',
            payload: 'Ack=1\nSACK left edge=1001\nSACK right edge=2001',
          }),
        ],
      ),
      s(
        'Recover missing data',
        'In this short trace, the retransmission timer expires. The sender retransmits the missing bytes, and the receiver acknowledges the complete stream.',
        'Real TCP implementations can also infer loss using duplicate ACKs or time-based mechanisms.',
        [
          p(
            'client',
            'server',
            'TCP',
            'Retransmit Seq=1',
            'Retry bytes 1–1000 after the timer expires.',
            { port: 80, bytes: 1054, flags: 'ACK' },
          ),
          p('server', 'client', 'TCP', 'ACK=2001', 'All 2,000 bytes arrived in order.', {
            port: 80,
            bytes: 54,
            flags: 'ACK',
          }),
        ],
      ),
      s(
        'Close gracefully',
        'Each direction closes separately with FIN and ACK. The endpoint that actively closes normally enters TIME-WAIT.',
        'TCP is full-duplex: one direction can finish before the other.',
        [
          p('client', 'server', 'TCP', 'FIN, ACK', 'The client has no more data.', {
            port: 80,
            flags: 'FIN, ACK',
          }),
          p('server', 'client', 'TCP', 'ACK', 'Acknowledge the client’s FIN.', {
            port: 80,
            flags: 'ACK',
          }),
          p('server', 'client', 'TCP', 'FIN, ACK', 'The server also finishes.', {
            port: 80,
            flags: 'FIN, ACK',
          }),
          p('client', 'server', 'TCP', 'ACK', 'Acknowledge the server’s FIN.', {
            port: 80,
            flags: 'ACK',
          }),
        ],
      ),
    ],
    quiz: quiz(
      'What does ACK=2001 mean?',
      [
        'Packet 2001 arrived',
        'Bytes before 2001 were received; byte 2001 is next',
        'The connection uses port 2001',
      ],
      1,
      'TCP acknowledgments normally identify the next byte the receiver expects.',
    ),
  },
  {
    id: 'udp',
    name: 'UDP',
    fullName: 'User Datagram Protocol',
    category: 'Transport',
    layer: 4,
    port: 'Varies',
    color: 'blue',
    rfc: '768',
    tagline: 'Less ceremony. Independent datagrams.',
    description:
      'Follow a short voice stream to see what happens when delivery has no handshake, no acknowledgments, and no built-in retransmission.',
    takeaway:
      'UDP preserves datagram boundaries but does not guarantee arrival, order, or uniqueness.',
    devices: [client, router, { ...server, label: 'Media server' }],
    steps: [
      s(
        'Send immediately',
        'The application already knows the destination. Its first UDP datagram carries audio; no transport handshake is needed.',
        'A UDP header is just eight bytes.',
        [
          p('client', 'server', 'UDP', 'Voice frame 1', 'Send the first 20 ms of audio.', {
            port: 5004,
            bytes: 134,
            payload:
              'Source port: 50000\nDestination port: 5004\nUDP length: 100\nPayload: 92 bytes of audio',
          }),
        ],
      ),
      s(
        'Continue the stream',
        'Audio datagrams leave at regular intervals. Each one is delivered independently. Frame numbering belongs to the application, not UDP.',
        'Protocols such as RTP add their own sequence numbers and timestamps.',
        [
          p('client', 'server', 'UDP', 'Voice frame 2', 'Send the next audio frame.', {
            port: 5004,
            bytes: 134,
          }),
          p('client', 'server', 'UDP', 'Voice frame 3', 'The next audio frame is lost.', {
            port: 5004,
            bytes: 134,
            lost: true,
          }),
          p('client', 'server', 'UDP', 'Voice frame 4', 'Later audio still arrives.', {
            port: 5004,
            bytes: 134,
          }),
        ],
      ),
      s(
        'Handle the loss in the app',
        'UDP does not ask for the lost frame again. The application detects the missing frame and may conceal the short audio gap.',
        'Low delay matters more than retransmitting an old sound in many calls.',
      ),
      s(
        'Receive the other voice',
        'The remote side sends independent datagrams back. The application manages timing, buffering, and any recovery it needs.',
        'Using UDP does not prevent an application from implementing reliability.',
        [
          p('server', 'client', 'UDP', 'Remote audio', 'Receive the other speaker’s audio.', {
            port: 50000,
            bytes: 134,
          }),
        ],
      ),
    ],
    quiz: quiz(
      'Who can recover missing data in a UDP application?',
      ['UDP automatically', 'The application or a protocol above UDP', 'Nobody, ever'],
      1,
      'UDP has no retransmission mechanism. An application can add its own.',
    ),
  },
  {
    id: 'quic',
    name: 'QUIC',
    fullName: 'Secure multiplexed transport',
    category: 'Transport',
    layer: 4,
    port: '443 / UDP',
    color: 'blue',
    rfc: '9000',
    tagline: 'A modern transport for a faster web.',
    description:
      'Explore a secure transport built over UDP, combining TLS 1.3 with independent streams and connection IDs.',
    takeaway:
      'QUIC implements reliability above UDP and avoids TCP’s cross-stream head-of-line blocking.',
    devices: network,
    steps: [
      s(
        'Start securely',
        'A QUIC Initial packet carries the TLS ClientHello. QUIC does not perform a TCP handshake.',
        'Initial protection keys are publicly derivable; they do not hide the ClientHello.',
        [
          p('client', 'server', 'QUIC', 'Initial · ClientHello', 'Begin QUIC and TLS together.', {
            port: 443,
            bytes: 1250,
            payload:
              'Long header\nVersion: 1\nDestination connection ID: 8 bytes\nCRYPTO: TLS ClientHello',
          }),
        ],
      ),
      s(
        'Authenticate and agree on keys',
        'The server returns its Initial and Handshake packets. The client verifies the certificate and completes TLS.',
        'QUIC uses TLS for authentication and key agreement, but uses its own packet protection.',
        [
          p(
            'server',
            'client',
            'QUIC',
            'Initial + Handshake',
            'Server key exchange and authenticated handshake.',
            { port: 443, bytes: 1480, encrypted: true },
          ),
          p('client', 'server', 'QUIC', 'Handshake · Finished', 'Confirm the handshake.', {
            port: 443,
            bytes: 180,
            encrypted: true,
          }),
        ],
      ),
      s(
        'Open independent streams',
        'HTTP/3 sends different requests over different QUIC streams. Bytes are delivered in order within each stream.',
        'Loss on one stream need not stall delivery on another.',
        [
          p('client', 'server', 'QUIC', 'STREAM 0 · request', 'Request the home page.', {
            port: 443,
            bytes: 180,
            encrypted: true,
          }),
          p(
            'client',
            'server',
            'QUIC',
            'STREAM 4 · request',
            'Request a stylesheet independently.',
            { port: 443, bytes: 190, encrypted: true },
          ),
          p('server', 'client', 'QUIC', 'STREAM 4 · response', 'Deliver the stylesheet.', {
            port: 443,
            bytes: 1100,
            encrypted: true,
          }),
        ],
      ),
      s(
        'Acknowledge delivery',
        'QUIC ACK frames report received packets. Lost stream data can be carried in a new packet with a new packet number.',
        'A QUIC connection ID can help a connection survive a change of network address.',
        [
          p('client', 'server', 'QUIC', 'ACK', 'Acknowledge received packet ranges.', {
            port: 443,
            bytes: 82,
            encrypted: true,
          }),
        ],
      ),
    ],
    quiz: quiz(
      'Does QUIC rely on UDP for reliable delivery?',
      ['Yes', 'No, QUIC adds its own reliability', 'QUIC does not support reliability'],
      1,
      'UDP transports datagrams. QUIC adds acknowledgments, loss recovery, and ordered streams.',
    ),
  },
  {
    id: 'dns',
    name: 'DNS',
    fullName: 'Domain Name System',
    category: 'Network',
    layer: 7,
    port: '53',
    color: 'amber',
    rfc: '1034',
    tagline: 'Find an address behind a name.',
    description:
      'Follow an uncached lookup through a recursive resolver, a root server, a top-level domain server, and an authoritative server.',
    takeaway: 'DNS is a distributed hierarchy. Caching avoids repeating the whole journey.',
    devices: [
      device('client', 'Your device', '192.168.1.10', 'client', 85, 190),
      device('dns', 'Resolver', '192.0.2.53', 'dns', 310, 190),
      device('root', 'Root server', '192.0.2.1', 'server', 555, 55),
      device('tld', '.com server', '192.0.2.2', 'server', 710, 190),
      device('auth', 'Authoritative', '192.0.2.3', 'server', 555, 290),
    ],
    steps: [
      s(
        'Ask a resolver',
        'Your device asks its configured recursive resolver for example.com’s A record. Assume the answer is not cached.',
        'An A record maps a name to an IPv4 address; AAAA maps to IPv6.',
        [
          p('client', 'dns', 'DNS', 'A? example.com', 'Request recursive resolution.', {
            port: 53,
            bytes: 71,
          }),
        ],
      ),
      s(
        'Start at the root',
        'The resolver asks a root server. The root gives a referral to the servers responsible for .com.',
        'A referral says where to ask next; it is not the final address.',
        [
          p('dns', 'root', 'DNS', 'A? example.com', 'Ask a root server.', { port: 53 }),
          p('root', 'dns', 'DNS', 'Referral: .com', 'Return the .com nameservers.', {
            port: 53,
            bytes: 180,
          }),
        ],
      ),
      s(
        'Follow the delegation',
        'The .com server directs the resolver to the authoritative nameservers for example.com.',
        'The domain owner’s DNS records live at its authoritative service.',
        [
          p('dns', 'tld', 'DNS', 'A? example.com', 'Ask the top-level domain server.', {
            port: 53,
          }),
          p('tld', 'dns', 'DNS', 'Referral: example.com', 'Return authoritative nameservers.', {
            port: 53,
            bytes: 180,
          }),
        ],
      ),
      s(
        'Get the authoritative answer',
        'The authoritative server returns the A record. The resolver can cache it for its time to live (TTL).',
        'TTL limits how long cached data can be reused.',
        [
          p('dns', 'auth', 'DNS', 'A? example.com', 'Ask the authoritative server.', { port: 53 }),
          p('auth', 'dns', 'DNS', 'A 203.0.113.10', 'Return the requested address.', {
            port: 53,
            bytes: 87,
            payload: 'AA=1 • RCODE=NOERROR\nexample.com 300 IN A 203.0.113.10',
          }),
        ],
      ),
      s(
        'Return and cache',
        'The resolver returns the result to your device. A later lookup can use the cached record until its TTL expires.',
        'DNS also carries mail routing, verification, and many other record types.',
        [
          p('dns', 'client', 'DNS', '203.0.113.10 · TTL 300', 'Return the final answer.', {
            port: 53,
            bytes: 87,
          }),
        ],
      ),
    ],
    quiz: quiz(
      'What is the purpose of a DNS TTL?',
      ['Choose the TCP port', 'Limit how long an answer can be cached', 'Encrypt a DNS record'],
      1,
      'TTL is the lifetime of a cached DNS record, measured in seconds.',
    ),
  },
  {
    id: 'ip',
    name: 'IPv4',
    fullName: 'Internet Protocol version 4',
    category: 'Network',
    layer: 3,
    port: '—',
    color: 'amber',
    rfc: '791',
    tagline: 'A route across interconnected networks.',
    description:
      'Discover how destination addresses, routing tables, and TTL move a packet beyond your local network.',
    takeaway:
      'IP makes a best effort to deliver packets; it does not provide reliable, ordered delivery.',
    devices: network,
    steps: [
      s(
        'Check the destination',
        'The client compares 203.0.113.10 with its local 192.168.1.0/24 network. The destination is remote.',
        'A subnet mask separates the network prefix from the host portion.',
      ),
      s(
        'Send to the gateway',
        'The packet’s destination IP is still the remote server. The local Ethernet frame is addressed to the router’s MAC address.',
        'IP addresses identify endpoints; link-layer addresses identify the next local hop.',
        [
          p(
            'client',
            'router',
            'IPv4',
            'Dst: 203.0.113.10',
            'Forward the packet to the default gateway.',
            {
              bytes: 98,
              payload: 'Version: 4\nSource: 192.168.1.10\nDestination: 203.0.113.10\nTTL: 64',
            },
          ),
        ],
      ),
      s(
        'Forward and decrement TTL',
        'The router selects the next hop using its routing table and decreases TTL. This home-router example also translates the private source address with NAT.',
        'Routing and NAT are separate operations. Not every router performs NAT.',
        [
          p(
            'router',
            'server',
            'IPv4',
            'TTL 63 · forwarded',
            'Forward through the internet (intermediate hops omitted).',
            {
              bytes: 98,
              payload:
                'Source after NAT: 198.51.100.7\nDestination: 203.0.113.10\nTTL after this hop: 63',
            },
          ),
        ],
      ),
      s(
        'Deliver the reply',
        'The reply follows routing decisions back to the public address. The home router reverses its NAT mapping for the client.',
        'The return route need not use the exact same routers.',
        [
          p('server', 'client', 'IPv4', 'Reply', 'Route the response back through the gateway.', {
            bytes: 98,
          }),
        ],
      ),
    ],
    quiz: quiz(
      'What happens to IPv4 TTL at each router?',
      ['It increases by one', 'It is reset to 64', 'It decreases by at least one'],
      2,
      'Routers decrement TTL. When it expires, the packet is discarded and an ICMP Time Exceeded message may be sent.',
    ),
  },
  {
    id: 'ipv6',
    name: 'IPv6',
    fullName: 'Internet Protocol version 6',
    category: 'Network',
    layer: 3,
    port: '—',
    color: 'amber',
    rfc: '8200',
    tagline: 'A much larger address space.',
    description:
      'See a host discover its router, learn an IPv6 prefix, and resolve a neighbor before sending traffic.',
    takeaway: 'IPv6 uses 128-bit addresses and Neighbor Discovery instead of ARP.',
    devices: [
      { ...client, address: 'fe80::10' },
      { ...router, address: 'fe80::1' },
      { ...server, address: '2001:db8:2::10' },
    ],
    steps: [
      s(
        'Solicit a router',
        'The host sends an ICMPv6 Router Solicitation to the all-routers multicast address ff02::2.',
        'IPv6 uses multicast rather than broadcast.',
        [
          p(
            'client',
            'router',
            'ICMPv6',
            'Router Solicitation',
            'Ask local routers to announce themselves.',
            { bytes: 70, payload: 'Type: 133\nDestination: ff02::2' },
          ),
        ],
      ),
      s(
        'Learn the prefix',
        'The router advertises a prefix, its lifetime, and configuration flags. Here the prefix permits SLAAC.',
        'SLAAC lets a host form an address from an advertised prefix.',
        [
          p('router', 'client', 'ICMPv6', 'Router Advertisement', 'Advertise 2001:db8:1::/64.', {
            bytes: 118,
            payload:
              'Type: 134\nPrefix: 2001:db8:1::/64\nAutonomous flag: 1\nRouter lifetime: 1800 s',
          }),
        ],
      ),
      s(
        'Check uniqueness',
        'Before using a tentative address, the host performs Duplicate Address Detection. This simplified example receives no conflicting response.',
        'A tentative address is not used for ordinary traffic until DAD succeeds.',
        [
          p(
            'client',
            'router',
            'ICMPv6',
            'Neighbor Solicitation · DAD',
            'Multicast to the tentative address’s solicited-node group; the router is shown as a local-network participant.',
            {
              bytes: 78,
              payload: 'Source: ::\nDestination: ff02::1:ff00:10\nTarget: 2001:db8:1::10',
            },
          ),
        ],
      ),
      s(
        'Resolve the next hop',
        'A Neighbor Solicitation and Advertisement resolve the router’s link-layer address.',
        'Neighbor Discovery performs functions that ARP and router discovery handle in IPv4.',
        [
          p(
            'client',
            'router',
            'ICMPv6',
            'Who has fe80::1?',
            'Resolve the gateway’s MAC address.',
            { bytes: 86 },
          ),
          p(
            'router',
            'client',
            'ICMPv6',
            'Neighbor Advertisement',
            'Return the gateway’s MAC address.',
            { bytes: 86 },
          ),
        ],
      ),
      s(
        'Send IPv6 traffic',
        'The client forwards a packet to the router. Each router decrements Hop Limit, the IPv6 equivalent of TTL.',
        'The IPv6 base header is always 40 bytes.',
        [
          p('client', 'server', 'IPv6', 'Hop Limit 64', 'Send to the remote IPv6 server.', {
            bytes: 118,
          }),
        ],
      ),
    ],
    quiz: quiz(
      'Which protocol replaces ARP’s role in IPv6?',
      ['ICMPv6 Neighbor Discovery', 'DNS', 'DHCPv4'],
      0,
      'Neighbor Discovery, carried in ICMPv6, resolves neighbors and discovers routers.',
    ),
  },
  {
    id: 'icmp',
    name: 'ICMP',
    fullName: 'Internet Control Message Protocol',
    category: 'Network',
    layer: 3,
    port: '—',
    color: 'amber',
    rfc: '792',
    tagline: 'Feedback from the network.',
    description:
      'Use an echo request and reply to understand ping, then see how an expired TTL produces a network error message.',
    takeaway:
      'ICMP reports network conditions. A missing reply does not necessarily mean a host is down.',
    devices: network,
    steps: [
      s(
        'Send an echo request',
        'The ping utility sends an ICMP Echo Request, with an identifier, sequence number, and payload.',
        'ICMP runs directly over IP; it has no TCP or UDP ports.',
        [
          p('client', 'server', 'ICMP', 'Echo Request', 'Ping the remote server.', {
            bytes: 98,
            payload: 'Type: 8 • Code: 0\nIdentifier: 42 • Sequence: 1\nPayload: 56 bytes',
          }),
        ],
      ),
      s(
        'Receive an echo reply',
        'If allowed, the server returns an Echo Reply containing the same payload. Ping measures the round-trip time.',
        'Firewalls may block ICMP even when other services work.',
        [
          p('server', 'client', 'ICMP', 'Echo Reply', 'Return the echo data.', {
            bytes: 98,
            payload: 'Type: 0 • Code: 0\nIdentifier: 42 • Sequence: 1',
          }),
        ],
      ),
      s(
        'Try a limited lifetime',
        'A probe with TTL=1 reaches the first router, where its TTL expires. The router discards it.',
        'Traceroute varies TTL to discover routers along a path.',
        [
          p('client', 'router', 'IPv4', 'TTL=1', 'A short-lived probe reaches the gateway.', {
            bytes: 98,
          }),
        ],
      ),
      s(
        'Report time exceeded',
        'The router sends ICMP Time Exceeded, including part of the original packet so the sender can identify the probe.',
        'ICMP errors help diagnose delivery problems.',
        [
          p('router', 'client', 'ICMP', 'Time Exceeded', 'Report that the probe expired.', {
            bytes: 70,
            payload: 'Type: 11 • Code: 0\nQuoted original IP header and payload prefix',
          }),
        ],
      ),
    ],
    quiz: quiz(
      'Does no ping reply prove a server is offline?',
      ['Yes', 'No; ICMP may be filtered', 'Only on Wi-Fi'],
      1,
      'ICMP can be filtered or rate-limited. Check the relevant application service as well.',
    ),
  },
  {
    id: 'arp',
    name: 'ARP',
    fullName: 'Address Resolution Protocol',
    category: 'Network',
    layer: 2,
    port: '—',
    color: 'amber',
    rfc: '826',
    tagline: 'An IP address meets a hardware address.',
    description:
      'See how an IPv4 host finds the MAC address it needs to send an Ethernet frame on the local network.',
    takeaway: 'ARP resolves local IPv4 neighbors, not remote hosts across the internet.',
    devices: network,
    steps: [
      s(
        'Check the neighbor cache',
        'The client needs to reach its gateway at 192.168.1.1. No cached MAC address is available.',
        'For a remote destination, the host resolves the gateway’s MAC, not the remote server’s.',
      ),
      s(
        'Broadcast the question',
        'The client sends an ARP Request to ff:ff:ff:ff:ff:ff. Every device on this local broadcast domain receives it.',
        'ARP stays on the local link and is not forwarded by routers.',
        [
          p(
            'client',
            'router',
            'ARP',
            'Who has 192.168.1.1?',
            'Broadcast an ARP request on the LAN.',
            {
              bytes: 60,
              payload:
                'Operation: request\nSender IP: 192.168.1.10\nTarget IP: 192.168.1.1\nEthernet destination: ff:ff:ff:ff:ff:ff',
            },
          ),
        ],
      ),
      s(
        'Receive the answer',
        'The gateway replies with its MAC address. The client saves the mapping in its neighbor cache.',
        'The reply normally goes directly to the requesting host.',
        [
          p(
            'router',
            'client',
            'ARP',
            '192.168.1.1 is at 02:00:00:00:00:01',
            'Return the link-layer address.',
            {
              bytes: 60,
              payload: 'Operation: reply\nSender MAC: 02:00:00:00:00:01\nSender IP: 192.168.1.1',
            },
          ),
        ],
      ),
      s(
        'Send the frame',
        'The client can now address an Ethernet frame to the router. The encapsulated IP packet still points to the remote server.',
        'Link-layer headers change at each routed hop.',
        [
          p(
            'client',
            'router',
            'Ethernet',
            'Frame to gateway',
            'Carry an IP packet in a local frame.',
            { bytes: 98 },
          ),
        ],
      ),
    ],
    quiz: quiz(
      'To send to a remote website, whose MAC does a host usually resolve?',
      ['The website’s server', 'Its default gateway', 'A root DNS server'],
      1,
      'Ethernet delivers to the next local hop. The gateway routes onward using the IP destination.',
    ),
  },
  {
    id: 'dhcp',
    name: 'DHCP',
    fullName: 'Dynamic Host Configuration Protocol',
    category: 'Network',
    layer: 7,
    port: '67 / 68',
    color: 'amber',
    rfc: '2131',
    tagline: 'Join a network. Get your settings.',
    description:
      'Follow the classic Discover, Offer, Request, Acknowledge exchange that leases an IPv4 address to a new device.',
    takeaway: 'DHCP leases addresses and can supply a gateway, subnet mask, and DNS servers.',
    devices: [
      { ...client, address: '0.0.0.0 → 192.168.1.10' },
      { ...router, label: 'DHCP server' },
      server,
    ],
    steps: [
      s(
        'Discover a server',
        'With no usable IPv4 address, the client broadcasts DHCPDISCOVER from UDP port 68 to port 67.',
        'The client identifies itself using a client identifier or hardware address.',
        [
          p('client', 'router', 'DHCP', 'DISCOVER', 'Broadcast to find a DHCP server.', {
            port: 67,
            bytes: 342,
            payload:
              'Source: 0.0.0.0:68\nDestination: 255.255.255.255:67\nMessage type: DHCPDISCOVER',
          }),
        ],
      ),
      s(
        'Offer a lease',
        'The server proposes an address and lease settings. An offer does not yet finalize the allocation.',
        'The server may provide multiple configuration options.',
        [
          p(
            'router',
            'client',
            'DHCP',
            'OFFER · 192.168.1.10',
            'Offer an eight-hour address lease.',
            {
              port: 68,
              bytes: 342,
              payload:
                'Your IP: 192.168.1.10\nLease: 28800 s\nRouter: 192.168.1.1\nDNS: 192.0.2.53',
            },
          ),
        ],
      ),
      s(
        'Request the offer',
        'The client broadcasts DHCPREQUEST, naming the selected server and requested address.',
        'Other servers can learn that their offers were not selected.',
        [
          p('client', 'router', 'DHCP', 'REQUEST', 'Accept the selected offer.', {
            port: 67,
            bytes: 342,
          }),
        ],
      ),
      s(
        'Acknowledge the lease',
        'The server sends DHCPACK. The host can check for address conflicts and configure the interface.',
        'A lease must be renewed before it expires; it is not permanent ownership.',
        [
          p(
            'router',
            'client',
            'DHCP',
            'ACK · lease granted',
            'Confirm the address and network settings.',
            { port: 68, bytes: 342 },
          ),
        ],
      ),
    ],
    quiz: quiz(
      'Which order describes initial DHCP address assignment?',
      ['Discover → Offer → Request → ACK', 'SYN → ACK → FIN', 'Request → Discover → Offer → FIN'],
      0,
      'DORA is a useful shorthand for the four-message DHCP lease exchange.',
    ),
  },
  {
    id: 'ethernet',
    name: 'Ethernet',
    fullName: 'Frames and local switching',
    category: 'Network',
    layer: 2,
    port: '—',
    color: 'amber',
    rfc: '894',
    tagline: 'Deliver a frame across the local network.',
    description:
      'Learn how a switch uses source and destination MAC addresses to connect devices on a wired LAN.',
    takeaway:
      'Ethernet switches learn from source MAC addresses and forward by destination MAC address.',
    devices: [
      client,
      { ...router, id: 'switch', label: 'LAN switch', address: 'Layer 2 bridge', kind: 'switch' },
      { ...server, label: 'Local server', address: '192.168.1.20' },
    ],
    steps: [
      s(
        'Build a frame',
        'The sender wraps an IP packet in an Ethernet frame with source and destination MAC addresses and an EtherType.',
        'EtherType 0x0800 identifies IPv4; 0x86DD identifies IPv6.',
        [
          p('client', 'switch', 'Ethernet', 'EtherType 0x0800', 'Send a frame into the switch.', {
            bytes: 98,
            payload: 'Source: 02:00:00:00:00:10\nDestination: 02:00:00:00:00:20\nEtherType: 0x0800',
          }),
        ],
      ),
      s(
        'Learn the source',
        'The switch records which port leads to the sender’s source MAC address.',
        'The forwarding table is learned from incoming traffic, not from DNS.',
      ),
      s(
        'Forward or flood',
        'If the destination MAC is unknown, the switch floods the frame to other ports in the same VLAN. Here the local server receives it.',
        'A known destination is forwarded only through its learned port.',
        [
          p(
            'switch',
            'server',
            'Ethernet',
            'Unknown unicast → flood',
            'Forward to eligible ports; only the destination accepts the frame.',
            { bytes: 98 },
          ),
        ],
      ),
      s(
        'Learn the return path',
        'The reply teaches the switch the server’s MAC location. Future traffic can use the learned unicast path.',
        'A switch does not decrement the IP TTL while bridging frames.',
        [
          p('server', 'switch', 'Ethernet', 'Reply frame', 'Learn the server’s source MAC.', {
            bytes: 98,
          }),
          p(
            'switch',
            'client',
            'Ethernet',
            'Known unicast',
            'Forward through the client’s learned port.',
            { bytes: 98 },
          ),
        ],
      ),
    ],
    quiz: quiz(
      'Which field teaches a switch where a device is?',
      ['Source MAC address', 'Destination IP address', 'TCP port'],
      0,
      'The switch associates the incoming port with the frame’s source MAC.',
    ),
  },
  {
    id: 'wifi',
    name: 'Wi-Fi',
    fullName: 'Wireless LAN · WPA2-Personal',
    category: 'Network',
    layer: 2,
    port: '—',
    color: 'amber',
    rfc: 'IEEE 802.11',
    tagline: 'From radio discovery to a secure link.',
    description:
      'Follow the major stages of joining a WPA2-Personal network: discovery, association, key confirmation, and protected data.',
    takeaway: 'Joining Wi-Fi and obtaining an IP address are separate processes.',
    devices: [
      client,
      { ...router, label: 'Access point', kind: 'wifi', address: 'SSID: Home network' },
      server,
    ],
    steps: [
      s(
        'Discover the network',
        'The access point advertises its network name and capabilities in beacon frames. A device may also probe for networks.',
        'Beacons advertise the network; they do not grant access.',
        [
          p(
            'router',
            'client',
            '802.11',
            'Beacon · Home network',
            'Advertise the SSID and WPA2 capabilities.',
            { bytes: 220 },
          ),
        ],
      ),
      s(
        'Authenticate and associate',
        'The device completes Open System authentication and association with the access point. The shared password has not been proven yet.',
        'In WPA2-Personal, password-based key confirmation happens in the four-way handshake.',
        [
          p(
            'client',
            'router',
            '802.11',
            'Authentication request',
            'Begin Open System authentication.',
            { bytes: 30 },
          ),
          p(
            'router',
            'client',
            '802.11',
            'Authentication response',
            'Accept the authentication exchange.',
            { bytes: 30 },
          ),
          p('client', 'router', '802.11', 'Association request', 'Request association.', {
            bytes: 160,
          }),
          p('router', 'client', '802.11', 'Association response', 'Confirm association.', {
            bytes: 100,
          }),
        ],
      ),
      s(
        'Confirm session keys',
        'Four EAPOL-Key messages exchange nonces and confirm that both sides hold the key material derived from the password.',
        'The password is not transmitted over the air.',
        [
          p('router', 'client', 'EAPOL', '1 / 4 · ANonce', 'Send the access point nonce.', {
            bytes: 155,
          }),
          p(
            'client',
            'router',
            'EAPOL',
            '2 / 4 · SNonce + MIC',
            'Return the client nonce and integrity check.',
            { bytes: 155 },
          ),
          p(
            'router',
            'client',
            'EAPOL',
            '3 / 4 · Install keys',
            'Confirm keys and distribute protected group key material.',
            { bytes: 211 },
          ),
          p('client', 'router', 'EAPOL', '4 / 4 · Confirm', 'Acknowledge key installation.', {
            bytes: 155,
          }),
        ],
      ),
      s(
        'Carry protected traffic',
        'The link now carries protected data frames. DHCP or IPv6 configuration can supply network-layer settings next.',
        'Wi-Fi link encryption ends at the access point. HTTPS can protect traffic end to end.',
        [
          p(
            'client',
            'router',
            '802.11',
            'Protected data',
            'Encrypt a data frame on the wireless link.',
            { bytes: 180, encrypted: true },
          ),
        ],
      ),
    ],
    quiz: quiz(
      'Does joining Wi-Fi automatically complete IPv4 address configuration?',
      ['Yes', 'No, IP configuration is a separate step', 'Only on port 443'],
      1,
      'Wi-Fi establishes the link. DHCP or manual configuration supplies IPv4 settings.',
    ),
  },
  {
    id: 'tls',
    name: 'TLS',
    fullName: 'Transport Layer Security',
    category: 'Security',
    layer: 6,
    port: 'Varies',
    color: 'violet',
    rfc: '8446',
    tagline: 'Agree on secrets. Prove an identity.',
    description:
      'Inspect the main parts of a TLS 1.3 handshake over an existing TCP connection, from ClientHello to protected application data.',
    takeaway:
      'TLS protects many applications, not just HTTP. Its OSI placement is a conceptual approximation.',
    devices: network,
    steps: [
      s(
        'Offer capabilities',
        'The client sends supported TLS versions, cipher suites, and a key share. This example does not use Encrypted ClientHello.',
        'Without ECH, the server name in ClientHello can be visible to observers.',
        [
          p('client', 'server', 'TLS', 'ClientHello', 'Offer TLS 1.3 and an X25519 key share.', {
            port: 443,
            bytes: 517,
            payload:
              'supported_versions: TLS 1.3\ncipher_suites: TLS_AES_128_GCM_SHA256\nkey_share: X25519\nserver_name: example.com',
          }),
        ],
      ),
      s(
        'Select and derive keys',
        'The server chooses parameters and returns its key share. Both sides derive handshake traffic keys.',
        'The private key shares never cross the network.',
        [
          p(
            'server',
            'client',
            'TLS',
            'ServerHello',
            'Select the cipher and exchange the server’s key share.',
            { port: 443, bytes: 144 },
          ),
        ],
      ),
      s(
        'Authenticate the server',
        'EncryptedExtensions, Certificate, CertificateVerify, and Finished follow. The client validates the certificate chain and hostname.',
        'A certificate binds an identity to a public key; CertificateVerify proves possession of its private key.',
        [
          p(
            'server',
            'client',
            'TLS',
            'Certificate + Finished',
            'Send the encrypted authenticated handshake.',
            { port: 443, bytes: 1480, encrypted: true },
          ),
        ],
      ),
      s(
        'Confirm the transcript',
        'The client sends Finished, proving it has the expected keys and handshake transcript.',
        'Finished detects tampering with the negotiated handshake.',
        [
          p('client', 'server', 'TLS', 'Finished', 'Confirm the handshake.', {
            port: 443,
            bytes: 94,
            encrypted: true,
          }),
        ],
      ),
      s(
        'Protect application data',
        'The application can now send encrypted, integrity-protected records using application traffic keys.',
        'This illustration omits optional client certificates, resumption, and 0-RTT.',
        [
          p('client', 'server', 'TLS', 'Application data', 'Send protected application bytes.', {
            port: 443,
            bytes: 240,
            encrypted: true,
          }),
        ],
      ),
    ],
    quiz: quiz(
      'What does a TLS server certificate help verify?',
      ['The server’s identity', 'The physical network route', 'The website’s honesty'],
      0,
      'Certificate validation helps authenticate the server identity, not the safety or truth of its content.',
    ),
  },
  {
    id: 'ssh',
    name: 'SSH',
    fullName: 'Secure Shell',
    category: 'Security',
    layer: 7,
    port: '22',
    color: 'violet',
    rfc: '4253',
    tagline: 'A secure terminal across the network.',
    description:
      'Open a remote shell through version negotiation, key exchange, host verification, and user authentication.',
    takeaway: 'SSH authenticates the server host and the user separately.',
    devices: [client, router, { ...server, label: 'SSH server' }],
    steps: [
      s(
        'Connect and identify',
        'After TCP connects to port 22, both endpoints exchange SSH version strings.',
        'The early version banners are not encrypted.',
        [
          ...handshake(22),
          p('server', 'client', 'SSH', 'SSH-2.0', 'Advertise the SSH protocol version.', {
            port: 22,
            bytes: 88,
            payload: 'SSH-2.0-OpenSSH_9.9',
          }),
        ],
      ),
      s(
        'Exchange keys',
        'Both sides agree on algorithms and establish a shared secret. The server signs the exchange with its host key.',
        'Verify host-key fingerprints through a trusted channel when first connecting.',
        [
          p('client', 'server', 'SSH', 'KEXINIT', 'Offer key exchange and encryption algorithms.', {
            port: 22,
            bytes: 600,
          }),
          p(
            'server',
            'client',
            'SSH',
            'Host key + key exchange',
            'Prove the host’s key and derive session keys.',
            { port: 22, bytes: 500 },
          ),
        ],
      ),
      s(
        'Authenticate the user',
        'Inside the encrypted session, the client proves its user identity, for example with a public-key signature.',
        'A user’s private authentication key stays on the client.',
        [
          p(
            'client',
            'server',
            'SSH',
            'User authentication',
            'Prove authorization using a signed challenge.',
            { port: 22, bytes: 300, encrypted: true },
          ),
          p('server', 'client', 'SSH', 'Authentication success', 'Accept the user.', {
            port: 22,
            bytes: 80,
            encrypted: true,
          }),
        ],
      ),
      s(
        'Open a shell channel',
        'The client opens a session channel and requests a shell. Input and output travel as encrypted channel data.',
        'SSH can multiplex several channels through the same connection.',
        [
          p('client', 'server', 'SSH', 'CHANNEL_OPEN', 'Open a session and request a shell.', {
            port: 22,
            bytes: 140,
            encrypted: true,
          }),
          p('server', 'client', 'SSH', 'Shell output', 'Return the remote prompt.', {
            port: 22,
            bytes: 120,
            encrypted: true,
          }),
        ],
      ),
    ],
    quiz: quiz(
      'Is an SSH host key the same as a user authentication key?',
      ['Yes', 'No, they authenticate different identities', 'Only on Linux'],
      1,
      'The host key authenticates the server. User keys authenticate a user to that server.',
    ),
  },
  {
    id: 'smtp',
    name: 'SMTP',
    fullName: 'Simple Mail Transfer Protocol',
    category: 'Application',
    layer: 7,
    port: '25 / 587',
    color: 'rose',
    rfc: '5321',
    tagline: 'Hand a message to the next mail server.',
    description:
      'Follow a simplified server-to-server mail transfer: greeting, envelope, message content, and acceptance.',
    takeaway:
      'SMTP transfers mail. Retrieving and synchronizing a mailbox uses protocols such as IMAP.',
    devices: [
      { ...client, label: 'Sending mail server', address: '192.0.2.25' },
      router,
      { ...server, label: 'Receiving mail server' },
    ],
    steps: [
      s(
        'Greet the server',
        'After TCP connects, the receiving server sends 220. The sender introduces itself with EHLO.',
        'This educational trace omits optional STARTTLS and authentication.',
        [
          p('server', 'client', 'SMTP', '220 Ready', 'Announce the mail service.', {
            port: 25,
            bytes: 92,
          }),
          p('client', 'server', 'SMTP', 'EHLO sender.example', 'Introduce the sending server.', {
            port: 25,
            bytes: 82,
          }),
          p('server', 'client', 'SMTP', '250 Hello', 'Advertise supported extensions.', {
            port: 25,
            bytes: 110,
          }),
        ],
      ),
      s(
        'Set the envelope',
        'MAIL FROM names the envelope sender. RCPT TO names a recipient. These are distinct from the message’s From and To headers.',
        'The SMTP envelope controls transport and bounce routing.',
        [
          p('client', 'server', 'SMTP', 'MAIL FROM', 'Set the envelope sender.', {
            port: 25,
            payload: 'MAIL FROM:<alice@sender.example>',
          }),
          p('server', 'client', 'SMTP', '250 OK', 'Accept the sender.', { port: 25 }),
          p('client', 'server', 'SMTP', 'RCPT TO', 'Set the recipient.', {
            port: 25,
            payload: 'RCPT TO:<bob@example.com>',
          }),
          p('server', 'client', 'SMTP', '250 OK', 'Accept the recipient.', { port: 25 }),
        ],
      ),
      s(
        'Transfer the message',
        'DATA asks to send the message. After 354, the sender transmits headers and body, ending with a line containing a single dot.',
        'Lines beginning with a dot are escaped using dot-stuffing.',
        [
          p('client', 'server', 'SMTP', 'DATA', 'Request message transfer.', { port: 25 }),
          p('server', 'client', 'SMTP', '354 Start mail input', 'Ready to receive content.', {
            port: 25,
          }),
          p('client', 'server', 'SMTP', 'Headers + body', 'Transfer the message.', {
            port: 25,
            bytes: 350,
            payload:
              'From: alice@sender.example\nTo: bob@example.com\nSubject: Hello\n\nSee you soon!\n.',
          }),
        ],
      ),
      s(
        'Accept responsibility',
        'The receiver returns 250 after accepting the message. Delivery to the final mailbox can still happen later.',
        'Acceptance is not proof that the recipient read the email.',
        [
          p('server', 'client', 'SMTP', '250 Queued', 'Accept responsibility for the message.', {
            port: 25,
          }),
          p('client', 'server', 'SMTP', 'QUIT', 'End the session.', { port: 25 }),
          p('server', 'client', 'SMTP', '221 Bye', 'Close the session.', { port: 25 }),
        ],
      ),
    ],
    quiz: quiz(
      'What does an SMTP 250 after DATA mean?',
      [
        'The recipient read the email',
        'The server accepted responsibility for the message',
        'The mailbox was synchronized',
      ],
      1,
      'The server has accepted the message. It does not imply reading or final mailbox delivery.',
    ),
  },
  {
    id: 'imap',
    name: 'IMAP',
    fullName: 'Internet Message Access Protocol',
    category: 'Application',
    layer: 7,
    port: '993 / TLS',
    color: 'rose',
    rfc: '9051',
    tagline: 'Keep your mailbox in sync.',
    description:
      'Use an already secured and authenticated IMAP session to select a mailbox, fetch a message, and update its read flag.',
    takeaway:
      'IMAP manages messages stored on the server so multiple clients can share mailbox state.',
    devices: [client, router, { ...server, label: 'Mail server' }],
    steps: [
      s(
        'Select a mailbox',
        'The client selects INBOX. The server reports mailbox state, including the number of messages.',
        'This lesson starts after TLS and authentication have completed.',
        [
          p('client', 'server', 'IMAP', 'A1 SELECT INBOX', 'Open the inbox.', {
            port: 993,
            encrypted: true,
            payload: 'A1 SELECT INBOX',
          }),
          p('server', 'client', 'IMAP', '3 EXISTS', 'Report the mailbox state.', {
            port: 993,
            encrypted: true,
            payload: '* 3 EXISTS\nA1 OK [READ-WRITE] SELECT completed',
          }),
        ],
      ),
      s(
        'Fetch a message',
        'The client uses a stable UID to request a message body. BODY.PEEK avoids automatically setting the read flag.',
        'A UID remains stable within a mailbox’s UIDVALIDITY epoch.',
        [
          p(
            'client',
            'server',
            'IMAP',
            'A2 UID FETCH 42',
            'Request a message without marking it read.',
            { port: 993, encrypted: true, payload: 'A2 UID FETCH 42 (BODY.PEEK[])' },
          ),
          p('server', 'client', 'IMAP', 'Message content', 'Return headers and body.', {
            port: 993,
            bytes: 740,
            encrypted: true,
          }),
        ],
      ),
      s(
        'Mark it as read',
        'The client adds the \\Seen flag. That change lives on the server and can appear on another device.',
        'Flags such as \\Seen and \\Flagged belong to message metadata.',
        [
          p('client', 'server', 'IMAP', 'A3 UID STORE 42', 'Set the read flag.', {
            port: 993,
            encrypted: true,
            payload: 'A3 UID STORE 42 +FLAGS (\\Seen)',
          }),
          p('server', 'client', 'IMAP', 'A3 OK', 'Confirm the update.', {
            port: 993,
            encrypted: true,
          }),
        ],
      ),
    ],
    quiz: quiz(
      'Where does IMAP keep the shared mailbox state?',
      ['Only in the browser cache', 'On the mail server', 'Inside DNS'],
      1,
      'IMAP lets clients access and modify server-side mailbox state.',
    ),
  },
  {
    id: 'ftp',
    name: 'FTP',
    fullName: 'File Transfer Protocol',
    category: 'Application',
    layer: 7,
    port: '21 + data port',
    color: 'rose',
    rfc: '959',
    tagline: 'One connection for commands. Another for files.',
    description:
      'Follow a passive FTP download and discover why FTP needs a separate data connection.',
    takeaway: 'Plain FTP exposes credentials and data. SFTP is a different protocol built on SSH.',
    devices: [client, router, { ...server, label: 'FTP server' }],
    steps: [
      s(
        'Open the control channel',
        'The client connects to TCP port 21. Commands and replies use this control connection.',
        'This illustration starts with an already authenticated session.',
        handshake(21),
      ),
      s(
        'Request passive mode',
        'The client sends EPSV. The server announces a port for the client to open a data connection.',
        'Passive mode lets the client initiate both connections.',
        [
          p('client', 'server', 'FTP', 'EPSV', 'Ask for an extended passive data port.', {
            port: 21,
          }),
          p('server', 'client', 'FTP', '229 · port 50010', 'Announce the listening data port.', {
            port: 21,
            payload: '229 Entering Extended Passive Mode (|||50010|)',
          }),
        ],
      ),
      s(
        'Open the data connection',
        'The client opens a second TCP connection to the announced port, then requests the file over the control connection.',
        'File bytes travel separately from FTP command replies.',
        [
          ...handshake(50010),
          p('client', 'server', 'FTP', 'RETR notes.txt', 'Request a file.', { port: 21 }),
          p(
            'server',
            'client',
            'FTP',
            '150 Opening data connection',
            'Begin transferring the file.',
            { port: 21 },
          ),
        ],
      ),
      s(
        'Transfer and finish',
        'The server sends file bytes on the data connection, closes it, and confirms completion on the control connection.',
        'The control connection can remain open for more commands.',
        [
          p('server', 'client', 'FTP-DATA', 'notes.txt', 'Transfer file bytes.', {
            port: 50010,
            bytes: 900,
          }),
          p('server', 'client', 'FTP', '226 Transfer complete', 'Confirm successful transfer.', {
            port: 21,
          }),
        ],
      ),
    ],
    quiz: quiz(
      'Is SFTP just FTP with TLS added?',
      ['Yes', 'No; SFTP is a separate SSH-based protocol', 'Only in passive mode'],
      1,
      'FTP over TLS is FTPS. SFTP uses the SSH protocol family and has a different design.',
    ),
  },
  {
    id: 'ntp',
    name: 'NTP',
    fullName: 'Network Time Protocol',
    category: 'Application',
    layer: 7,
    port: '123 / UDP',
    color: 'rose',
    rfc: '5905',
    tagline: 'Agree on time across a network.',
    description:
      'Learn how four timestamps help estimate clock offset and network delay, rather than blindly copying a server’s clock.',
    takeaway: 'NTP estimates offset and delay; asymmetric network paths can introduce error.',
    devices: [client, router, { ...server, label: 'Time server', address: '192.0.2.123' }],
    steps: [
      s(
        'Timestamp the request',
        'The client records T1 when it sends an NTP request over UDP port 123.',
        'Timestamps refer to both local and remote clocks.',
        [
          p('client', 'server', 'NTP', 'Request · T1', 'Ask for a time sample.', {
            port: 123,
            bytes: 90,
            payload: 'Mode: 3 (client)\nT1: client transmit timestamp',
          }),
        ],
      ),
      s(
        'Return server timestamps',
        'The server records T2 when it receives the request and T3 when it transmits the response.',
        'The response echoes T1 so the client can match the exchange.',
        [
          p(
            'server',
            'client',
            'NTP',
            'Response · T2, T3',
            'Return receive and transmit timestamps.',
            {
              port: 123,
              bytes: 90,
              payload: 'Mode: 4 (server)\nOrigin: T1\nReceive: T2\nTransmit: T3',
            },
          ),
        ],
      ),
      s(
        'Estimate offset and delay',
        'The client records T4 on receipt. Offset is approximately ((T2−T1)+(T3−T4))/2; delay is (T4−T1)−(T3−T2).',
        'The simple offset estimate assumes similar delay in each direction.',
      ),
      s(
        'Discipline the clock',
        'The client uses repeated samples and usually multiple servers to adjust its clock carefully.',
        'A single sample can be distorted by network congestion or asymmetric routing.',
      ),
    ],
    quiz: quiz(
      'Why does NTP use four timestamps?',
      [
        'To estimate both delay and clock offset',
        'To encrypt the clock',
        'To discover the IP address',
      ],
      0,
      'The timestamps account for server processing time and estimate the network round trip and clock offset.',
    ),
  },
];
export const categories: Category[] = ['Web', 'Transport', 'Network', 'Security', 'Application'];
export const categoryColors: Record<Category, string> = {
  Web: 'mint',
  Transport: 'blue',
  Network: 'amber',
  Security: 'violet',
  Application: 'rose',
};
export const protocolById = (id: string) => protocols.find((p) => p.id === id) ?? protocols[0];
export interface TracePacket extends Packet {
  index: number;
  step: number;
  time: number;
}
export function getTrace(protocol: Protocol): TracePacket[] {
  let index = 0;
  return protocol.steps.flatMap((step, stepIndex) =>
    step.packets.map((packet) => ({
      ...packet,
      index: index++,
      step: stepIndex,
      time: Number((index * 0.012 + stepIndex * 0.018).toFixed(3)),
    })),
  );
}
export const learningPaths = [
  {
    title: 'Start with the web',
    description: 'Follow a browser request from name to page.',
    ids: ['http', 'dns', 'tcp', 'https'],
    icon: 'globe',
  },
  {
    title: 'Understand the network',
    description: 'Connect devices and route packets between them.',
    ids: ['ethernet', 'arp', 'ip', 'icmp', 'dhcp', 'wifi', 'ipv6'],
    icon: 'network',
  },
  {
    title: 'Go beyond the basics',
    description: 'Explore modern transports and secure connections.',
    ids: ['udp', 'tls', 'quic', 'websocket', 'ssh'],
    icon: 'layers',
  },
  {
    title: 'Meet everyday applications',
    description: 'Mail, file transfers, and the clocks behind them.',
    ids: ['smtp', 'imap', 'ftp', 'ntp'],
    icon: 'app',
  },
];
