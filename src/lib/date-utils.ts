// Date formatting utilities for booking display

export const formatShortDate = ( dateString: string ): string => {
  const date = new Date( dateString );
  return date.toLocaleDateString( "en-US", {
    day: "numeric",
    month: "short",
  } );
};

export const formatTime = ( dateString: string ): string => {
  const date = new Date( dateString );
  return date.toLocaleTimeString( "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  } );
};

export const formatFullDate = ( dateString: string ): string => {
  const date = new Date( dateString );
  return date.toLocaleDateString( "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  } );
};
