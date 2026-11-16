import { describe, expect, it } from "vitest";
import { parseProxyLine, parseProxyList } from "@/lib/ai/proxy-parser";

describe("proxy credential parser", () => {
  it("parses host:port:username:password", () => {
    const proxy = parseProxyLine("203.0.113.10:8080:user:pass", 1);
    expect(proxy).toMatchObject({ host: "203.0.113.10", port: 8080, username: "user", password: "pass", error: null });
  });
  it("parses username:password@host:port and schemes", () => {
    expect(parseProxyLine("user:secret@proxy.example.com:3128", 2)).toMatchObject({ host: "proxy.example.com", port: 3128, username: "user", password: "secret" });
    expect(parseProxyLine("https://user:secret@proxy.example.com:443", 3)).toMatchObject({ protocol: "https", port: 443 });
  });
  it("supports SOCKS5 credentials and protocol override", () => {
    const proxy = parseProxyLine("user:pass@203.0.113.10:1080", 8, "socks5");
    expect(proxy).toMatchObject({ protocol: "socks5", host: "203.0.113.10", port: 1080, error: null });
    expect(parseProxyLine("socks5://u:p@proxy.example.com:1080", 9)?.protocol).toBe("socks5");
  });
  it("parses bracketed IPv6 proxy entries", () => {
    const proxy = parseProxyLine("[2001:db8::10]:1080:user:pass", 10, "socks5");
    expect(proxy).toMatchObject({ host: "2001:db8::10", port: 1080, protocol: "socks5", error: null });
  });
  it("parses host:port without authentication", () => {
    expect(parseProxyLine("proxy.example.com:8080", 4)).toMatchObject({ host: "proxy.example.com", port: 8080, username: null, password: null });
  });
  it("rejects malformed ports, private hosts and incomplete auth", () => {
    expect(parseProxyLine("proxy.example.com:99999", 5)?.error).toBeTruthy();
    expect(parseProxyLine("127.0.0.1:8080", 6)?.error).toBeTruthy();
    expect(parseProxyLine("proxy.example.com:8080:user", 7)?.error).toBeTruthy();
  });
  it("detects duplicates and ignores blank lines", () => {
    const result = parseProxyList("a.example.com:8080:u:p\n\na.example.com:8080:u:p\nb.example.com:3128");
    expect(result.parsed).toHaveLength(2);
    expect(result.duplicates).toBe(1);
    expect(result.total).toBe(3);
  });
});
