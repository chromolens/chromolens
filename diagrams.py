import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.animation as manimation


def output(pos, focus, zoom):
    if pos <= focus:
        return focus * ((pos / focus) ** zoom)
    else:
        return (1 - (1 - focus) * (((1 - pos) / (1 - focus)) ** zoom))


def input(pos, focus, zoom):
    if pos <= focus:
        return focus * ((pos / focus) ** (1.0 / zoom))
    else:
        return (1 - ((1 - focus) * (
            ((1 - pos) / (1 - focus)) ** (1.0 / zoom))))


def output_np(pos, focus, zoom):
    return np.where(pos <= focus,
                    focus * ((pos / focus) ** zoom),
                    (1 - (1 - focus) * (((1 - pos) / (1 - focus)) ** zoom)))


def input_np(pos, focus, zoom):
    return np.where(pos < focus,
                    focus * ((pos / focus) ** (1.0 / zoom)),
                    (1 - ((1 - focus) * (
                        ((1 - pos) / (1 - focus)) ** (1.0 / zoom)))))

FFMpegWriter = manimation.writers['ffmpeg']
metadata = dict(title='Polynomial zoom', artist='Marc-Antoine Parent',
                comment='with matplotlib')

writer = FFMpegWriter(fps=15, metadata=metadata)

fig = plt.figure()
l, = plt.plot([], [], '-')
l2, = plt.plot([], [], '-', color='r')

plt.xlim(0, 1)
plt.ylim(0, 1)

t = np.arange(0, 1, 0.001)

focus = 0.2
c = [0, 1]
with writer.saving(fig, "zoom.mp4", 90):
    for zoom in np.arange(1, 10, 0.1):
        l.set_data(t, input_np(t, focus, zoom))
        b = np.arange(0, 1, 0.01)
        c = focus + (b - focus) / zoom
        l2.set_data(b, c)
        writer.grab_frame()

zoom = 5
with writer.saving(fig, "focus.mp4", 101):
    for focus in np.arange(0, 1.001, 0.01):
        l.set_data(t, input_np(t, focus, zoom))
        b = np.arange(0, 1, 0.01)
        c = focus + (b - focus) / zoom
        l2.set_data(b, c)
        writer.grab_frame()
