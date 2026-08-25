const verses = [
  {
    text: '“For the weapons of our warfare are not carnal, but mighty through God to the pulling down of strong holds”',
    reference: '2 Corinthians 10:4',
  },
  {
    text: '“And this is the confidence that we have in him, that, if we ask anything according to his will, he heareth us”',
    reference: '1 John 5:14–15',
  },
];

export default function Home() {
  return (
    <main className="app-shell">
      <section className="reading-screen" aria-label="Today’s devotional">
        <header className="reading-hero">
          <nav className="app-bar" aria-label="Reading actions">
            <span className="wordmark">THE CHRISTIAN&apos;S DAILY CHALLENGE</span>
            <div className="app-actions">
              <button className="icon-button" type="button" aria-label="Reader settings">
                Aa
              </button>
              <button className="icon-button" type="button" aria-label="Save this reading">
                Save
              </button>
            </div>
          </nav>

          <div className="hero-copy">
            <p className="eyebrow">AUGUST 24, 2026</p>
            <h1>Expecting answers to prayer</h1>
            <div className="hero-meta" aria-label="Reading information">
              <span>DAY 237</span>
              <span>3 MIN</span>
            </div>
          </div>
        </header>

        <article className="reading-card">
          <div className="reading-content">
            {verses.map((verse) => (
              <blockquote className="verse" key={verse.reference}>
                <p>{verse.text}</p>
                <cite>{verse.reference}</cite>
              </blockquote>
            ))}

            <p>
              There are no impossibilities to these intercessors, for they have to do with the God of all power and might to Whom nothing is impossible. Heaven and earth are there to serve them, and they are full of joyous faith.
            </p>
            <p>
              The intercessor must often wait for a time in the outer court before he gains access to the Holiest of all. When this is so he must tarry and knock till the inner door opens to him, and he is granted admission to the Throne-room. When once he has entered, the cause is all but won.
            </p>
            <p>
              What had been at first weary work in prayer becomes easy, the divine stream lays hold of and floods his heart, his horizon widens. He has been granted an audience with the King of Heaven. He is certain of acceptance.
            </p>

            <p className="attribution">—Sister Eva.</p>

            <div className="publisher-credit">
              <p>The Christian’s Daily Challenge by Edwin and Lillian Harvey</p>
              <p>Published by Harvey Christian Publishers</p>
            </div>
          </div>
        </article>

        <nav className="tab-bar" aria-label="Primary navigation">
          <a className="tab active" href="#today" aria-current="page">
            Today
          </a>
          <a className="tab" href="#archive">
            Archive
          </a>
          <a className="tab" href="#saved">
            Saved
          </a>
          <a className="tab" href="#settings">
            Settings
          </a>
        </nav>
      </section>
    </main>
  );
}
