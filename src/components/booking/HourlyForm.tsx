
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "../ui/button";

interface HourlyFormProps {
  onBack: () => void;
}

export function HourlyForm( { onBack }: HourlyFormProps ) {
  return (
    <motion.div
      initial={ { opacity: 0, x: 20 } }
      animate={ { opacity: 1, x: 0 } }
      exit={ { opacity: 0, x: -20 } }
      className="flex w-full max-w-2xl flex-col"
    >
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={ onBack }
          className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors hover:bg-white/10 hover:border-[#D4AF37]"
        >
          <ArrowLeft className="h-5 w-5 text-white transition-transform group-hover:-translate-x-1" />
        </button>
        <div>
          <h3 className="font-serif text-2xl text-white">Hourly Service</h3>
          <p className="font-sans text-sm font-light text-gray-400">
            Flexible chauffeur service by the hour
          </p>
        </div>
      </div>

      <form className="space-y-6" onSubmit={ ( e ) => e.preventDefault() }>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-[#D4AF37]">Pickup Location</label>
            <input
              type="text"
              placeholder="Enter pickup address"
              className="w-full rounded-none border-b border-white/20 bg-transparent px-0 py-3 text-white placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-hidden transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-[#D4AF37]">Duration</label>
            <select
              className="w-full rounded-none border-b border-white/20 bg-transparent px-0 py-3 text-white focus:border-[#D4AF37] focus:outline-hidden transition-colors [&>option]:bg-black"
            >
              <option>3 Hours (Minimum)</option>
              <option>4 Hours</option>
              <option>5 Hours</option>
              <option>6 Hours</option>
              <option>8 Hours</option>
              <option>10 Hours</option>
              <option>12+ Hours</option>
            </select>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-[#D4AF37]">Date</label>
            <input
              type="date"
              className="w-full rounded-none border-b border-white/20 bg-transparent px-0 py-3 text-white placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-hidden transition-colors scheme-dark"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-[#D4AF37]">Time</label>
            <input
              type="time"
              className="w-full rounded-none border-b border-white/20 bg-transparent px-0 py-3 text-white placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-hidden transition-colors scheme-dark"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-[#D4AF37]">Passengers</label>
            <select
              className="w-full rounded-none border-b border-white/20 bg-transparent px-0 py-3 text-white focus:border-[#D4AF37] focus:outline-hidden transition-colors [&>option]:bg-black"
            >
              <option>1 Passenger</option>
              <option>2 Passengers</option>
              <option>3 Passengers</option>
              <option>4+ Passengers</option>
            </select>
          </div>
        </div>

        <div className="pt-8">
          <Button className="w-full bg-[#D4AF37] text-black hover:bg-[#B5952F] py-6 text-lg tracking-widest uppercase">
            Reserve Now
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
