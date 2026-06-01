import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    jwt({ token, account }) {
      // Explicitly lock token.sub to the Google providerAccountId on each sign-in
      // so it remains stable across logout/re-login cycles (NextAuth v5 beta may
      // otherwise generate a random sub if user.id is undefined).
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
});
