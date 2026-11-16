import type { Device, Packet, Protocol } from '../data/protocols';

export interface Point {
  x: number;
  y: number;
}
export type JourneyPhase = 'prepare' | 'travel' | 'forward' | 'delivered' | 'dropped';
const bound = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const travelProgress = (progress: number) => bound((progress - 0.12) / 0.68, 0, 1);
export const routeProgress = (packet: Packet, progress: number) =>
  travelProgress(progress) * (packet.lost ? 0.68 : 1);

export function routeDevices(devices: Device[], from: string, to: string): Device[] {
  const start = devices.find((n) => n.id === from),
    end = devices.find((n) => n.id === to);
  if (!start || !end) return [];
  const router = devices.find((n) => n.id === 'router');
  return router && from !== 'router' && to !== 'router' && (from === 'client' || to === 'client')
    ? [start, router, end]
    : [start, end];
}
export function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
export function routeLength(route: Point[]) {
  return route.slice(1).reduce((sum, p, i) => sum + distance(route[i], p), 0);
}

/** Stop at device edges so the packet remains visible beside the device icon. */
export function packetPath(route: Point[]): Point[] {
  if (route.length < 2) return route;
  const shifted = route.map((p) => ({ x: p.x, y: p.y }));
  for (const [i, j] of [
    [0, 1],
    [route.length - 1, route.length - 2],
  ]) {
    const a = route[i],
      b = route[j],
      length = distance(a, b),
      offset = Math.min(39, length / 3);
    if (length)
      shifted[i] = {
        x: a.x + ((b.x - a.x) / length) * offset,
        y: a.y + ((b.y - a.y) / length) * offset,
      };
  }
  return shifted;
}
export function pointOnRoute(
  route: Point[],
  fraction: number,
): Point & { angle: number; segment: number } {
  if (route.length < 2) return { ...(route[0] ?? { x: 0, y: 0 }), angle: 0, segment: 0 };
  let remaining = routeLength(route) * bound(fraction, 0, 1);
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1],
      b = route[i],
      length = distance(a, b);
    if (remaining <= length || i === route.length - 1) {
      const t = length ? bound(remaining / length, 0, 1) : 0;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
        segment: i - 1,
      };
    }
    remaining -= length;
  }
  return { ...route[route.length - 1], angle: 0, segment: route.length - 2 };
}
export const pathOf = (points: Point[]) =>
  points.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
export function traveledPath(route: Point[], fraction: number) {
  const p = pointOnRoute(route, fraction);
  return pathOf([...route.slice(0, p.segment + 1), p]);
}
export function journeyPhase(
  protocol: Protocol,
  packet: Packet,
  progress: number,
  compact = false,
): JourneyPhase {
  if (progress < 0.12) return 'prepare';
  if (progress >= 0.8) return packet.lost ? 'dropped' : 'delivered';
  const devices = protocol.devices.map((n) =>
    compact ? { ...n, x: 45 + ((n.x - 85) / 625) * 330 } : n,
  );
  const route = packetPath(routeDevices(devices, packet.from, packet.to));
  return route.length > 2 && pointOnRoute(route, routeProgress(packet, progress)).segment > 0
    ? 'forward'
    : 'travel';
}
export const phaseLabel: Record<JourneyPhase, string> = {
  prepare: 'Preparing to send',
  travel: 'In transit',
  forward: 'Forwarding',
  delivered: 'Arrived',
  dropped: 'Dropped in transit',
};
export function friendlyPacketLabel(packet: Packet) {
  if (/^A\? /.test(packet.label)) return `DNS query: ${packet.label.slice(3)} (IPv4)`;
  if (packet.protocol === 'TCP' && packet.flags === 'SYN') return 'SYN · Request a connection';
  if (packet.protocol === 'TCP' && packet.flags === 'SYN, ACK')
    return 'SYN-ACK · Accept the connection';
  if (packet.protocol === 'TCP' && packet.label === 'ACK') return 'ACK · Confirm receipt';
  return packet.label;
}

export function packetExplanation(packet: Packet) {
  if (packet.protocol === 'DNS') {
    if (/^A\? /.test(packet.label))
      return {
        meaning:
          'An A-record question asks for an IPv4 address. The question mark is shorthand for a query; it is not a literal character sent in the DNS message.',
        after:
          'The DNS service reads the question and either answers from its cache, follows a referral, or continues resolving the name.',
      };
    if (packet.label.includes('Referral'))
      return {
        meaning:
          'This reply points to another set of name servers. It tells the resolver where to ask next, rather than giving it the final website address.',
        after: 'The resolver follows the delegation and sends another DNS question.',
      };
    return {
      meaning:
        'The answer carries the address associated with the requested name. A TTL tells the resolver or client how long it may reuse the record.',
      after:
        'The recipient can cache the answer and use the returned address for the next connection.',
    };
  }
  if (packet.protocol === 'TCP') {
    if (packet.lost)
      return {
        meaning:
          'This TCP segment contains numbered bytes, but a network problem drops it before delivery. The red cross marks a simulated loss, not a successful arrival.',
        after:
          'TCP must recover the missing data. This lesson shows the receiver reporting a gap and the sender later retransmitting.',
      };
    if (packet.label.includes('Retransmit'))
      return {
        meaning:
          'TCP sends the missing byte range again. The sequence number identifies where those bytes belong in the original stream.',
        after: 'The receiver can fill the gap and acknowledge a contiguous range of bytes.',
      };
    if (packet.flags === 'SYN')
      return {
        meaning:
          'SYN asks to establish a TCP connection and supplies the sender’s initial sequence number and capabilities. This is setup, not the HTTP request.',
        after: 'The server can respond with SYN-ACK if it accepts the connection.',
      };
    if (packet.flags === 'SYN, ACK')
      return {
        meaning:
          'The server acknowledges the client’s SYN and supplies its own starting sequence number. Each direction has a separate byte sequence.',
        after: 'The client sends the final ACK to complete the three-way handshake.',
      };
    if (packet.flags?.includes('FIN'))
      return {
        meaning:
          'FIN says this sender has no more bytes to send. It closes one direction of the connection; the other direction can still carry data.',
        after:
          'The peer acknowledges the FIN and independently closes its sending direction when ready.',
      };
    if (packet.label.includes('SACK'))
      return {
        meaning:
          'The ACK still names the missing byte. Selective acknowledgment identifies later byte ranges that arrived, allowing the sender to avoid resending them unnecessarily.',
        after:
          'The sender uses this delivery information, together with its loss detection, to decide what needs retransmission.',
      };
    if (packet.flags === 'ACK' && !packet.payload?.includes('Len='))
      return {
        meaning:
          'The acknowledgment number normally gives the next byte the receiver expects. It confirms receipt of earlier bytes; it does not prove that the application has processed them.',
        after:
          'The peer updates its delivery state and can continue sending within the allowed window.',
      };
    return {
      meaning:
        'TCP carries a numbered portion of the application’s byte stream. Sequence numbers let the receiver order data and detect gaps.',
      after:
        'The receiver buffers the data, acknowledges received bytes, and delivers the ordered stream to the application.',
    };
  }
  if (packet.protocol === 'HTTP') {
    if (packet.label.includes('Upgrade:'))
      return {
        meaning:
          'This HTTP request asks the server to switch this connection to WebSocket. Upgrade and Connection headers carry that request, and Sec-WebSocket-Key supplies a handshake nonce.',
        after:
          'The server validates the request. A successful 101 response allows both endpoints to start exchanging WebSocket frames.',
      };
    return packet.label.startsWith('GET')
      ? {
          meaning:
            'GET / requests the root resource. The Host header selects the website, and the other headers describe the request. In plain HTTP these bytes are readable on the path.',
          after:
            'The server processes the request and prepares an HTTP response with a status code, headers, and usually a body.',
        }
      : {
          meaning:
            'The HTTP status line describes the result. Response headers describe the content or negotiate protocol behavior; a response body may follow.',
          after: packet.label.startsWith('200')
            ? 'The browser can parse the returned HTML. Images, scripts, and styles may require further requests.'
            : 'The receiving application interprets the status and follows the negotiated HTTP behavior.',
        };
  }
  if (packet.protocol === 'UDP')
    return {
      meaning: packet.lost
        ? 'This datagram is lost. UDP has no built-in acknowledgment or retransmission, so the sender does not automatically retry it.'
        : 'UDP sends an independent datagram without a transport handshake. Any ordering, timing, or recovery belongs to the application above it.',
      after: packet.lost
        ? 'The voice application can conceal the missing frame and carry on with later audio.'
        : 'The destination port directs the datagram to the receiving application, which decides how to use its contents.',
    };
  if (packet.protocol === 'TLS' || packet.protocol === 'HTTPS')
    return {
      meaning: packet.label.includes('ClientHello')
        ? 'ClientHello proposes TLS versions, cipher suites, and key shares. Without Encrypted ClientHello, the server name can still be visible.'
        : packet.encrypted
          ? 'This part of the exchange is protected by TLS. The endpoints can interpret its contents; an observer on the path cannot read the protected application data.'
          : 'This handshake message negotiates cryptographic parameters. ServerHello is visible; later TLS 1.3 handshake messages are encrypted.',
      after:
        packet.protocol === 'HTTPS'
          ? 'The receiving endpoint decrypts and verifies the TLS record before processing its HTTP content.'
          : 'The receiving endpoint processes the handshake message, validates the relevant cryptographic checks, and advances the TLS state.',
    };
  if (packet.protocol === 'QUIC')
    return {
      meaning:
        'QUIC carries its own connection state, packet numbers, and frames over UDP. It adds encryption and reliable streams; those guarantees do not come from UDP itself.',
      after:
        'The peer processes the QUIC frames. It may acknowledge packet ranges, advance the handshake, or deliver stream data.',
    };
  if (packet.protocol === 'ARP')
    return {
      meaning:
        'ARP asks for or supplies the MAC address associated with a local IPv4 neighbor. Its broadcast request stays on the local network.',
      after:
        'A reply can populate the neighbor cache, allowing Ethernet frames to be addressed to the next hop.',
    };
  if (packet.protocol === 'DHCP')
    return {
      meaning:
        'This message belongs to the address-lease negotiation. The client and server exchange the requested address and configuration such as the gateway, DNS server, and lease lifetime.',
      after:
        'The peer moves to the next stage of Discover, Offer, Request, and Acknowledge. The address is leased rather than permanently assigned.',
    };
  if (packet.protocol === 'WebSocket')
    return {
      meaning: `${packet.summary} WebSocket frames carry an opcode, length, and message data over the established TCP connection. Client masking is not encryption.`,
      after:
        'The peer interprets the frame as application data or a control message. Either side can send without waiting for a new HTTP request.',
    };
  if (packet.protocol === 'IPv4')
    return {
      meaning: `${packet.summary} The IP header identifies the source and final destination. Link-layer addressing separately selects the next local hop.`,
      after:
        packet.label === 'TTL=1'
          ? 'The gateway decrements the TTL to zero and discards this probe. It can send an ICMP Time Exceeded message back to the sender.'
          : 'A router checks its forwarding table and decrements TTL. At the destination, the IP protocol field identifies the next protocol to process.',
    };
  if (packet.protocol === 'IPv6')
    return {
      meaning:
        'IPv6 uses 128-bit source and destination addresses. Its Hop Limit bounds how many router hops the packet can survive; it is not a time measured in seconds.',
      after:
        'Each forwarding router decrements Hop Limit. At the destination, the Next Header field identifies an extension header or the upper-layer protocol.',
    };
  if (packet.protocol === 'ICMPv6')
    return {
      meaning: `${packet.summary} This is IPv6 control traffic. Router advertisements describe network configuration; neighbor discovery resolves local neighbors and checks address uniqueness.`,
      after: packet.label.includes('DAD')
        ? 'If another node reports that it already owns the tentative address, the client must not use that address. Otherwise, after the required checks, the address can become usable.'
        : 'The receiving IPv6 node updates the relevant configuration or neighbor state. Neighbor discovery uses multicast instead of ARP broadcasts.',
    };
  if (packet.protocol === 'ICMP')
    return {
      meaning:
        packet.label === 'Time Exceeded'
          ? 'This control message reports that a packet expired in transit. It includes part of the original packet so the sender can identify the failed probe.'
          : `An ICMP ${packet.label.toLowerCase()} carries an identifier, sequence number, and echo data. Ping uses the request and reply to measure reachability and round-trip time.`,
      after:
        packet.label === 'Echo Request'
          ? 'The target may return an Echo Reply. A missing reply does not by itself prove the target is down, because ICMP can be filtered.'
          : 'The sender matches the response to its probe and reports the timing or network error.',
    };
  if (packet.protocol === 'Ethernet')
    return {
      meaning: `${packet.summary} The frame includes source and destination MAC addresses. EtherType identifies the payload protocol, such as IPv4 with 0x0800.`,
      after:
        'A switch learns the source MAC on the incoming port. It uses its MAC table to forward known destinations, and floods eligible ports for unknown destinations or broadcasts.',
    };
  if (packet.protocol === '802.11')
    return {
      meaning: `${packet.summary} Wi-Fi management frames establish the local wireless relationship; data frames later carry higher-layer traffic over that link.`,
      after: packet.encrypted
        ? 'The access point verifies and decrypts the protected wireless frame before forwarding its payload toward the destination.'
        : 'The station or access point processes this management exchange and advances scanning, authentication, or association.',
    };
  if (packet.protocol === 'EAPOL')
    return {
      meaning: `${packet.summary} The WPA2 four-way handshake proves possession of key material and installs traffic keys. The Wi-Fi password itself is not sent in these messages.`,
      after:
        'The peers validate the nonce or message integrity information for this stage. After key installation completes, they can exchange protected wireless data.',
    };
  if (packet.protocol === 'SSH')
    return {
      meaning: `${packet.summary} ${packet.encrypted ? 'This message is inside the encrypted SSH transport. User authentication and session channels are separate stages above that transport.' : 'SSH first negotiates its version and algorithms, then establishes keys and authenticates the server host key.'}`,
      after:
        packet.label === 'SSH-2.0'
          ? 'Both endpoints exchange supported algorithms before performing key exchange.'
          : 'The peer processes the SSH message for the current handshake, authentication, or channel state. A shell opens only after the required authentication succeeds.',
    };
  if (packet.protocol === 'SMTP')
    return {
      meaning: `${packet.summary} SMTP separates the delivery envelope (MAIL FROM and RCPT TO) from the message headers and body sent after DATA.`,
      after:
        packet.label === '250 Queued'
          ? 'The receiving server has accepted responsibility for this message. That does not guarantee final inbox delivery; later delivery errors may still occur.'
          : 'The receiver processes the command or reply. Numeric replies report success, temporary failure, or permanent failure for the current SMTP operation.',
    };
  if (packet.protocol === 'IMAP')
    return {
      meaning: `${packet.summary} IMAP synchronizes a mailbox stored on the server. Command tags match replies to requests; UIDs identify messages within a mailbox and UIDVALIDITY context.`,
      after:
        'The client applies the reported mailbox content or flag changes. The server remains the source of mailbox state, allowing other clients to observe the same changes.',
    };
  if (packet.protocol === 'FTP' || packet.protocol === 'FTP-DATA')
    return {
      meaning:
        packet.protocol === 'FTP-DATA'
          ? 'File bytes travel on the separate data connection. They are not carried inside the FTP command connection on port 21.'
          : `${packet.summary} The control connection negotiates commands and replies. Passive mode selects a separate server port for the data connection.`,
      after:
        packet.protocol === 'FTP-DATA'
          ? 'After the data transfer ends, the server reports its result over the control connection.'
          : 'The peer acts on the FTP command or numeric status. Plain FTP does not encrypt credentials, commands, or file contents.',
    };
  if (packet.protocol === 'NTP')
    return {
      meaning: packet.label.startsWith('Request')
        ? 'The client records T1 when it sends this UDP request. The request asks for a time sample, not a command to immediately set the local clock.'
        : 'The server echoes T1 and supplies T2 (request received) and T3 (reply sent). These timestamps allow the client to separate server processing from network travel time.',
      after: packet.label.startsWith('Request')
        ? 'The server records its receive and transmit timestamps and returns them in the response.'
        : 'The client records T4 on receipt. It estimates offset as ((T2−T1)+(T3−T4))/2 and delay as (T4−T1)−(T3−T2), with path asymmetry limiting accuracy.',
    };
  return {
    meaning: packet.summary,
    after: packet.encrypted
      ? 'The authorized endpoint verifies and decodes the protected message, then the lesson continues with the next exchange.'
      : `The recipient processes this ${packet.protocol} message according to the current lesson step. ${packet.payload ? 'Open the packet inspector to see its illustrative fields.' : ''}`,
  };
}

export function phaseDescription(protocol: Protocol, packet: Packet, phase: JourneyPhase) {
  const route = routeDevices(protocol.devices, packet.from, packet.to),
    from = route[0],
    to = route[route.length - 1],
    via = route.length > 2 ? route[1] : undefined;
  if (phase === 'prepare')
    return `${from.label} prepares this ${packet.protocol} message for ${to.label}. ${packet.summary}`;
  if (phase === 'dropped')
    return 'The packet stops here and does not reach its destination. The crossed marker shows where this simulation drops it.';
  if (phase === 'delivered')
    return `${to.label} receives the message. ${packetExplanation(packet).after}`;
  if (phase === 'forward')
    return `${via?.label ?? 'The next hop'} forwards it toward ${to.label}. ${packet.encrypted ? 'An intermediate router forwards the traffic without decrypting the protected message.' : 'The next hop is selected using network addressing, not the application message’s meaning.'}`;
  if (via)
    return `${from.label} sends the packet toward ${via.label}, the next hop on this illustrated route. Its destination is still ${to.label}.`;
  return `The ${packet.protocol} message travels from ${from.label} toward ${to.label}. The line shows an illustrative path; physical links and additional hops may be omitted.`;
}

export function constrainCamera(center: Point, zoom: number, width: number, height: number): Point {
  return {
    x: bound(center.x, width / (2 * zoom), width - width / (2 * zoom)),
    y: bound(center.y, height / (2 * zoom), height - height / (2 * zoom)),
  };
}
