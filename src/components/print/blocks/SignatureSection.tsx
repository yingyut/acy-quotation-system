import type { DocumentPrintData } from '@/lib/pdf/types';

export function SignatureSection({ data }: { data: DocumentPrintData }) {
  const cfg = data.config.signature;
  if (cfg.boxes.length === 0) return null;
  return (
    <div className="signature-block" style={{ minHeight: `${cfg.heightMm}mm` }} data-role="signature-section">
      {cfg.boxes.map((box, i) => {
        const isPreparer = i === cfg.boxes.length - 1;
        return (
          <div className="signature-col" key={i}>
            <div className="signature-title">{box.label}</div>
            {box.showSignatureImage &&
              (data.company.preparedSignatureDataUri ? (
                <img className="signature-img" src={data.company.preparedSignatureDataUri} alt="" />
              ) : (
                <div className="signature-img-placeholder" />
              ))}
            {box.showStamp && data.company.stampDataUri && (
              <img className="stamp-img" src={data.company.stampDataUri} alt="" />
            )}
            <div className="signature-line">{isPreparer ? data.preparedByName : 'ลงชื่อ'}</div>
            {box.showDateLine && <div className="signature-date">วันที่ ....../....../......</div>}
          </div>
        );
      })}
    </div>
  );
}
