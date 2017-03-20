import MotionInjector from 'inject-loader!src/Motion'
import {
  createVM,
  nextTick,
} from '../helpers'

const msPerFrame = 1000 / 60

let Motion

describe('Motion', function () {
  beforeEach(function () {
    let now = 0
    const queue = []
    this.raf = sinon.spy(cb => {
      queue.push(cb)
    })
    this.step = function step (n = 1) {
      for (let i = 0; i < n; ++i) {
        if (!queue.length) return
        queue.shift()()
      }
    }
    this.stepUntil = function step (fn, maxCount = 5000) {
      let count = 0
      while (queue.length && !fn() && count++ < maxCount) {
        queue.shift()()
      }
      if (count >= maxCount) throw new Error('Too many calls')
    }
    this.timeSlowdown = 1
    this.now = sinon.spy(() => now += this.timeSlowdown * msPerFrame) // eslint-disable-line no-return-assign
    Motion = MotionInjector({
      './utils': {
        raf: this.raf,
        now: this.now,
      },
    }).default
  })

  afterEach(function () {
  })

  it('change a value over time', function (done) {
    const vm = createVM(this, `
<Motion :value="n" :spring="config">
  <template scope="values">
    <pre>{{ values.value }}</pre>
  </template>
</Motion>
`, {
  data: {
    n: 0,
    config: {
      stiffness: 170,
      damping: 26,
      precision: 0.01,
    },
  },
  components: { Motion },
})
    vm.$('pre').should.have.text('0')
    vm.n = 10
    nextTick().then(() => {
      this.step()
    }).then(() => {
      vm.$('pre').should.have.text('0.4722222222222221')
      this.step()
    }).then(() => {
      vm.$('pre').should.have.text('1.1897376543209877')
      this.stepUntil(() => vm.$('pre').text === '10')
    }).then(done)
  })

  it('works with imperfect time', function (done) {
    this.timeSlowdown = 11
    const vm = createVM(this, `
<Motion :value="n" :spring="config">
  <template scope="values">
    <pre>{{ values.value }}</pre>
  </template>
</Motion>
`, {
  data: {
    n: 0,
    config: {
      stiffness: 170,
      damping: 26,
      precision: 0.01,
    },
  },
  components: { Motion },
})
    vm.$('pre').should.have.text('0')
    vm.n = 10
    nextTick().then(() => {
      this.step()
    }).then(() => {
      vm.$('pre').should.have.text('0')
      this.timeSlowdown = 0.01
      this.step()
    }).then(() => {
      vm.$('pre').should.have.text('0.0047222222222211485')
      this.step()
    }).then(() => {
      vm.$('pre').should.have.text('0.009444444444442297')
    }).then(done)
  })

  it.skip('works with jsx', function () {
    const vm = createVM(this, function (h) {
      const options = {
        scopedSlots: {
          default: values => (
            <pre>{values}</pre>
          ),
        },
      }
      return (
        <Motion value={this.n}
                spring={this.config}
                {...options}
        />
      )
    }, {
      data: {
        n: 0,
        config: {
          stiffness: 170,
          damping: 26,
          precision: 0.01,
        },
      },
      components: { Motion },
    })
    vm
  })
})
