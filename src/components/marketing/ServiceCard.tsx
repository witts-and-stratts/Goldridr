import Image from "next/image";
import { cn } from "@/lib/utils";
import styles from "@/styles/marketingcards.module.css";

interface ServiceCardProps {
  iconSrc: string;
  title: string;
  description: string;
  className?: string;
}

export function ServiceCard( { iconSrc, title, description, className }: ServiceCardProps ) {
  return (
    <div className={ styles.serviceCard }>
      <div className={ styles.serviceIconArea }>
        <div className={ cn( styles.serviceIcon, className ) }>
          <Image src={ iconSrc } alt="" fill className="object-contain" />
        </div>
      </div>
      <h3 className={ styles.serviceTitle }>{ title }</h3>
      <p className={ styles.serviceCopy }>{ description }</p>
    </div>
  );
}
