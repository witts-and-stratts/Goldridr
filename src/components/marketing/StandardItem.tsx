import Image from "next/image";
import { cn } from "@/lib/utils";
import styles from "@/styles/marketingcards.module.css";

interface StandardItemProps {
  title: string;
  description: string;
  src: string;
  className?: string;
}

export function StandardItem( { title, description, src, className }: StandardItemProps ) {
  return (
    <div className={ styles.standardItem }>
      <div className={ styles.standardIconArea }>
        <Image src={ src } alt="" width={ 48 } height={ 48 } className={ cn( "size-14", className ) } />
      </div>
      <h4 className={ styles.standardTitle }>{ title }</h4>
      <p className={ styles.standardCopy }>{ description }</p>
    </div>
  );
}
