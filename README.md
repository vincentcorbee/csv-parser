# CSV Parser

https://datatracker.ietf.org/doc/html/rfc4180

The ABNF grammar

file = [header CRLF] record *(CRLF record) [CRLF]
header = name *(COMMA name)
record = field *(COMMA field)
name = field
field = (escaped / non-escaped)
escaped = DQUOTE *(TEXTDATA / COMMA / CR / LF / 2DQUOTE) DQUOTE
non-escaped = *TEXTDATA
COMMA = 0x2C
CR = 0x0D
DQUOTE =  0x22
LF = 0x0A
CRLF = CR LF
TEXTDATA = 0x20-21 - 0x23-2B - 0x2D-7E