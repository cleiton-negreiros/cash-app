import pg from 'pg'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const OFX_CONTENT = `OFXHEADER: 100
DATA: OFXSGML
VERSION: 102
SECURITY: NONE
ENCODING: UTF-8
CHARSET: 1252
COMPRESSION: NONE
OLDFILEUID: NONE
NEWFILEUID: NONE
<OFX>
  <SIGNONMSGSRSV1>
    <SONRS>
      <STATUS>
        <CODE>0</CODE>
        <SEVERITY>INFO</SEVERITY>
      </STATUS>
      <DTSERVER>20260630163858[-3:BRT]</DTSERVER>
      <LANGUAGE>POR</LANGUAGE>
      <FI>
        <ORG>Banco C6 S.A.</ORG>
        <FID>336</FID>
      </FI>
    </SONRS>
  </SIGNONMSGSRSV1>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <TRNUID>01KWD0NEE2QRD8WJEGX2RBCNM2</TRNUID>
      <STATUS>
        <CODE>0</CODE>
        <SEVERITY>INFO</SEVERITY>
      </STATUS>
      <STMTRS>
        <CURDEF>BRL</CURDEF>
        <BANKACCTFROM>
          <BANKID>336</BANKID>
          <BRANCHID>1</BRANCHID>
          <ACCTID>170084280</ACCTID>
          <ACCTTYPE>CHECKING</ACCTTYPE>
        </BANKACCTFROM>
        <BANKTRANLIST>
          <DTSTART>20260630163858[-3:BRT]</DTSTART>
          <DTEND>20260630163858[-3:BRT]</DTEND>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260602004538[-3:BRT]</DTPOSTED>
            <TRNAMT>-0.02</TRNAMT>
            <FITID>01KWD0NEE2NVT8BV0FT4THFQC4</FITID>
            <REFNUM>148458164431897733551619095542695266559</REFNUM>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260606134331[-3:BRT]</DTPOSTED>
            <TRNAMT>-6.35</TRNAMT>
            <FITID>01KWD0NEE276PDY5RDCNZPGZ28</FITID>
            <REFNUM>89237679771074411611534010243262144549</REFNUM>
            <MEMO>TOP SP TARFA*122660241 SAO PAULO     BRA</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260606223901[-3:BRT]</DTPOSTED>
            <TRNAMT>-5.95</TRNAMT>
            <FITID>01KWD0NEE23MN6M5SE959AZDMZ</FITID>
            <REFNUM>250149047878369421055335236269726007369</REFNUM>
            <MEMO>TOP SP TARFA*122730788 SAO PAULO     BRA</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260607090406[-3:BRT]</DTPOSTED>
            <TRNAMT>-5.95</TRNAMT>
            <FITID>01KWD0NEE2SRJEM0HT0ZQ34MAA</FITID>
            <REFNUM>230204670154991155543603185286981445443</REFNUM>
            <MEMO>TOP SP TARFA*122753067 SAO PAULO     BRA</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260607091428[-3:BRT]</DTPOSTED>
            <TRNAMT>-6.35</TRNAMT>
            <FITID>01KWD0NEE2N4ZN36XSS33JD3EF</FITID>
            <REFNUM>36422246603098302861111044988443582306</REFNUM>
            <MEMO>TOP SP TARFA*122753582 SAO PAULO     BRA</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260607214722[-3:BRT]</DTPOSTED>
            <TRNAMT>-6.35</TRNAMT>
            <FITID>01KWD0NEE2R1749657V05CA6JT</FITID>
            <REFNUM>70217381449709492091614841238088671878</REFNUM>
            <MEMO>TOP SP TARFA*122811402 SAO PAULO     BRA</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260607214731[-3:BRT]</DTPOSTED>
            <TRNAMT>-6.35</TRNAMT>
            <FITID>01KWD0NEE2F93B4NH6CKDRKFBR</FITID>
            <REFNUM>130358714463706886772198396609181223985</REFNUM>
            <MEMO>TOP SP TARFA*122811408 SAO PAULO     BRA</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260609102613[-3:BRT]</DTPOSTED>
            <TRNAMT>-800.0</TRNAMT>
            <FITID>01KWD0NEE22A2V7H6ET033GJ3G</FITID>
            <REFNUM>17036751975378139775472797483166729180</REFNUM>
            <MEMO>TRANSF ENVIADA PIX</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260610141121[-3:BRT]</DTPOSTED>
            <TRNAMT>-42.0</TRNAMT>
            <FITID>01KWD0NEE2NA657B0DRAP56SS7</FITID>
            <REFNUM>333706269949473234327969707324378020679</REFNUM>
            <MEMO>TRANSF ENVIADA PIX</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>CREDIT</TRNTYPE>
            <DTPOSTED>20260612105932[-3:BRT]</DTPOSTED>
            <TRNAMT>4855.23</TRNAMT>
            <FITID>01KWD0NEE2N4E55JFQ6S3MBC7J</FITID>
            <REFNUM>90913912188128453510834634480486373759</REFNUM>
            <MEMO>Pix recebido de Cleiton da Silva Negreiros</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>CREDIT</TRNTYPE>
            <DTPOSTED>20260612110220[-3:BRT]</DTPOSTED>
            <TRNAMT>2450.0</TRNAMT>
            <FITID>01KWD0NEE2SNE1V99BXXBWR52W</FITID>
            <REFNUM>116214265944084530003269573829038154030</REFNUM>
            <MEMO>Pix recebido de CLEITON DA SILVA NEGREIROS</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260612112901[-3:BRT]</DTPOSTED>
            <TRNAMT>-7267.58</TRNAMT>
            <FITID>01KWD0NEE2MT1X0F2X7NN54DHQ</FITID>
            <REFNUM>285977572118404278165285685243581901293</REFNUM>
            <MEMO>Fatura de cartão</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>CREDIT</TRNTYPE>
            <DTPOSTED>20260615074736[-3:BRT]</DTPOSTED>
            <TRNAMT>270.98</TRNAMT>
            <FITID>01KWD0NEE27J3T8MV8QRS5VRFY</FITID>
            <REFNUM>152643732134456861312973943910093601217</REFNUM>
            <MEMO>28643783889-CLEITON DA SILVA NEGREIROS</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260621224437[-3:BRT]</DTPOSTED>
            <TRNAMT>-300.0</TRNAMT>
            <FITID>01KWD0NEE2GBQ4FX4RV5FW52ZM</FITID>
            <REFNUM>113794202324220960036284363027220017270</REFNUM>
            <MEMO>TRANSF ENVIADA PIX</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>CREDIT</TRNTYPE>
            <DTPOSTED>20260630094238[-3:BRT]</DTPOSTED>
            <TRNAMT>2704.36</TRNAMT>
            <FITID>01KWD0NEE2QXDW8TY53VZTTZG7</FITID>
            <REFNUM>201110645730881216225396926310308729385</REFNUM>
            <MEMO>28643783889-CLEITON DA SILVA NEGREIROS</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260630131815[-3:BRT]</DTPOSTED>
            <TRNAMT>-1089.0</TRNAMT>
            <FITID>01KWD0NEE2S3G1GYA8BCJD3EHQ</FITID>
            <REFNUM>336238631399332211099713029271832803507</REFNUM>
            <MEMO>TRANSF ENVIADA PIX</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260630132548[-3:BRT]</DTPOSTED>
            <TRNAMT>-450.0</TRNAMT>
            <FITID>01KWD0NEE21BQQ1TDQJH902RX2</FITID>
            <REFNUM>210853318825423076735795023975247834612</REFNUM>
            <MEMO>TRANSF ENVIADA PIX</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260630132629[-3:BRT]</DTPOSTED>
            <TRNAMT>-1000.0</TRNAMT>
            <FITID>01KWD0NEE292T3R1NMWW9JQT78</FITID>
            <REFNUM>171715428002924360284299324509784713151</REFNUM>
            <MEMO>TRANSF ENVIADA PIX</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260630145749[-3:BRT]</DTPOSTED>
            <TRNAMT>-170.0</TRNAMT>
            <FITID>01KWD0NEE26PXQD1DHDJP3SFYV</FITID>
            <REFNUM>27082320227912979444211972033965646198</REFNUM>
            <MEMO>TRANSF ENVIADA PIX</MEMO>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`

function parseOFX(content) {
  const transactions = []
  const lines = content.split('\n')
  let currentDesc = ''
  let currentValue = 0
  let currentDate = ''
  let currentType = 'expense'

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('<NAME>')) {
      currentDesc = trimmed.replace('<NAME>', '').replace('</NAME>', '').trim()
    } else if (trimmed.startsWith('<MEMO>')) {
      currentDesc = trimmed.replace('<MEMO>', '').replace('</MEMO>', '').trim()
    } else if (trimmed.startsWith('<TRNTYPE>')) {
      const type = trimmed.replace('<TRNTYPE>', '').replace('</TRNTYPE>', '').trim()
      currentType = ['CREDIT', 'DEP'].includes(type) ? 'income' : 'expense'
    } else if (trimmed.startsWith('<DTPOSTED>')) {
      const raw = trimmed.replace('<DTPOSTED>', '').replace('</DTPOSTED>', '').trim()
      const m = raw.match(/^(\d{4})(\d{2})(\d{2})/)
      if (m) currentDate = `${m[1]}-${m[2]}-${m[3]}`
    } else if (trimmed.startsWith('<TRNAMT>')) {
      currentValue = Math.abs(parseFloat(trimmed.replace('<TRNAMT>', '').replace('</TRNAMT>', '').trim()))
    } else if (trimmed.startsWith('</STMTTRN>')) {
      if (currentValue || currentDate) {
        transactions.push({
          description: currentDesc || 'Sem descrição',
          value: currentValue,
          date: currentDate,
          type: currentType,
        })
      }
      currentDesc = ''
      currentValue = 0
      currentDate = ''
      currentType = 'expense'
    }
  }
  return transactions
}

const pool = new pg.Pool({
  connectionString: 'postgres://postgres.ykeexatcexgdhoyprixm:0ZnDmyLZgSrZhHiI@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true',
})

try {
  const parsed = parseOFX(OFX_CONTENT)
  console.log(`Parsed ${parsed.length} transactions`)
  console.log(JSON.stringify(parsed, null, 2))

  const profiles = await pool.query("SELECT id, name FROM profiles WHERE name ILIKE '%cleiton%'")
  if (profiles.rows.length === 0) {
    console.error('No user found')
    process.exit(1)
  }
  const user = profiles.rows[0]
  console.log(`User: ${user.name} (${user.id})`)

  const accounts = await pool.query("SELECT id, name FROM accounts WHERE user_id = $1 AND name ILIKE '%c6%'", [user.id])
  if (accounts.rows.length === 0) {
    console.error('No C6 account found')
    process.exit(1)
  }
  const account = accounts.rows[0]
  console.log(`Account: ${account.name} (${account.id})`)

  for (const tx of parsed) {
    const { error } = await pool.query(
      `INSERT INTO transactions (user_id, account_id, date, description, value, type, category, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Outros', 'paid')`,
      [user.id, account.id, tx.date, tx.description, tx.value, tx.type]
    )
    if (error) {
      console.error(`Error inserting: ${tx.description}`, error.message)
    } else {
      console.log(`Inserted: ${tx.description} - R$ ${tx.value}`)
    }
  }

  console.log(`\n${parsed.length} transações importadas com sucesso!`)
} catch (err) {
  console.error('Error:', err.message)
} finally {
  await pool.end()
}
