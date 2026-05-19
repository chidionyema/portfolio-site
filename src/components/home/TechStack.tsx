import { motion } from 'framer-motion';

const stack = [
  { name: '.NET 9', role: 'Runtime' },
  { name: 'MassTransit', role: 'Messaging' },
  { name: 'PostgreSQL', role: 'Primary DB' },
  { name: 'RabbitMQ', role: 'Broker' },
  { name: 'Redis', role: 'Cache' },
  { name: 'EF Core', role: 'ORM' },
  { name: 'Polly', role: 'Resilience' },
  { name: 'Vault', role: 'Secrets' },
  { name: 'Fly.io', role: 'Deploy' },
  { name: 'Supabase', role: 'Managed PG' },
];

export function TechStack() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="flex flex-wrap justify-center gap-3 py-8"
    >
      {stack.map((tech, i) => (
        <motion.div
          key={tech.name}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-warm border border-border text-xs"
        >
          <span className="font-semibold text-primary">{tech.name}</span>
          <span className="text-muted">{tech.role}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
