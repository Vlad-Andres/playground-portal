import Image from "next/image";

interface FigureImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
}

export function FigureImage({ src, alt, width, height, caption }: FigureImageProps) {
  return (
    <figure className="grid gap-2">
      <div className="overflow-hidden rounded-xl border border-line bg-white p-3">
        <Image
          src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/figures/${src}`}
          alt={alt}
          width={width}
          height={height}
          className="mx-auto h-auto max-h-[30rem] w-auto max-w-full"
        />
      </div>
      {caption ? <figcaption className="text-xs text-faint">{caption}</figcaption> : null}
    </figure>
  );
}
